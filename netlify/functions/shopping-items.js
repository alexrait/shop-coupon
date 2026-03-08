import { getDb, ensureDbReady } from './db.js';
import { notifyMembers } from './push.js';

export const handler = async (event, context) => {
    const user = context.clientContext?.user;
    if (!user) return { statusCode: 401, body: 'Unauthorized' };

    const sql = getDb();
    const userId = user.sub;
    const method = event.httpMethod;
    const listId = event.queryStringParameters?.list_id;

    console.log(`[shopping-items] ${method} request from user=${userId}, listId=${listId}`);

    if (!listId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'list_id is required' }) };
    }

    try {
        await ensureDbReady(sql, user);

        const [listInfo] = await sql`
            SELECT sl.name, 
                   CASE WHEN sl.owner_id = ${userId} OR slm.user_id = ${userId} THEN 1 ELSE 0 END as has_access
            FROM shopcoupon.shopping_lists sl
            LEFT JOIN shopcoupon.shopping_list_members slm ON sl.id = slm.list_id
            WHERE sl.id = ${listId}
            LIMIT 1
        `;

        if (!listInfo || !listInfo.has_access) {
            console.warn(`[shopping-items] Access denied for user=${userId} on list=${listId}`);
            return { statusCode: 403, body: 'Forbidden - No access to this shopping list' };
        }
        
        const listName = listInfo.name;

        if (method === 'GET') {
            const itemName = event.queryStringParameters?.name;
            
            if (itemName !== undefined) {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const items = await sql`
                    SELECT DISTINCT si.encrypted_name, COUNT(*) as purchase_count
                    FROM shopcoupon.shopping_items si
                    JOIN shopcoupon.shopping_lists sl ON si.list_id = sl.id
                    LEFT JOIN shopcoupon.shopping_list_members slm ON sl.id = slm.list_id
                    WHERE (sl.owner_id = ${userId} OR slm.user_id = ${userId})
                    AND si.bought_at >= ${thirtyDaysAgo}
                    AND si.encrypted_name ILIKE ${'%' + itemName + '%'}
                    GROUP BY si.encrypted_name
                    ORDER BY purchase_count DESC
                    LIMIT 10
                `;
                return { statusCode: 200, body: JSON.stringify(items.map(i => i.encrypted_name)) };
            }

            const items = await sql`
                SELECT * FROM shopcoupon.shopping_items 
                WHERE list_id = ${listId}
                ORDER BY position ASC, created_at DESC
            `;
            console.log(`[shopping-items GET] Returning ${items.length} items for list=${listId}`);
            return { statusCode: 200, body: JSON.stringify(items) };
        }

        if (method === 'POST') {
            const body = JSON.parse(event.body);
            const { encrypted_name, quantity } = body;

            console.log(`[shopping-items POST] Adding item: name=${encrypted_name}, qty=${quantity}`);

            const [maxPos] = await sql`SELECT COALESCE(MAX(position), 0) as max_p FROM shopcoupon.shopping_items WHERE list_id = ${listId}`;
            const nextPos = (maxPos?.max_p || 0) + 10;

            const [newItem] = await sql`
                INSERT INTO shopcoupon.shopping_items (list_id, encrypted_name, quantity, position)
                VALUES (${listId}, ${encrypted_name}, ${quantity || 1}, ${nextPos})
                RETURNING *
            `;

            console.log(`[shopping-items POST] Created item id=${newItem.id}`);

            // Notify members
            await notifyMembers(sql, listId, userId, 'addItem', {
                title: `${listName}: Item Added`,
                body: `New item added: ${encrypted_name}`,
                url: `/shopping-list/${listId}`
            });

            return { statusCode: 201, body: JSON.stringify(newItem) };
        }

        if (method === 'PATCH') {
            const itemId = event.queryStringParameters?.id;
            const body = JSON.parse(event.body);
            const { status, position, quantity, note, encrypted_name } = body;

            console.log(`[shopping-items PATCH] itemId=${itemId}, body=${JSON.stringify(body)}`);

            if (!itemId) return { statusCode: 400, body: JSON.stringify({ error: 'Item ID is required.' }) };

            // Determine which fields are being updated
            const hasStatus = status !== undefined;
            const hasPosition = position !== undefined;
            const hasQuantity = quantity !== undefined;
            const hasNote = note !== undefined;
            const hasName = encrypted_name !== undefined;

            console.log(`[shopping-items PATCH] Fields: hasStatus=${hasStatus}, hasPosition=${hasPosition}, hasQuantity=${hasQuantity}, hasNote=${hasNote}, hasName=${hasName}`);

            if (!hasStatus && !hasPosition && !hasQuantity && !hasNote && !hasName) {
                console.warn('[shopping-items PATCH] No updatable fields in body');
                return { statusCode: 400, body: JSON.stringify({ error: 'No fields to update provided.' }) };
            }

            let updated;

            // NOTE: @netlify/neon returns a tagged template literal function, NOT a pg client.
            // sql.query() does not work. We must use tagged template literals exclusively.
            // We branch on field combinations (same pattern as coupons.js).
            if (hasStatus) {
                const boughtAt = status === 'bought' ? new Date() : null;
                console.log(`[shopping-items PATCH] Updating status=${status}, bought_at=${boughtAt}`);

                if (hasPosition && hasQuantity && hasNote && hasName) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, position=${position}, quantity=${quantity}, note=${note}, encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasPosition && hasQuantity && hasNote) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, position=${position}, quantity=${quantity}, note=${note} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasPosition && hasQuantity) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, position=${position}, quantity=${quantity} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasPosition && hasNote) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, position=${position}, note=${note} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasPosition && hasName) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, position=${position}, encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasQuantity && hasNote && hasName) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, quantity=${quantity}, note=${note}, encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasQuantity && hasNote) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, quantity=${quantity}, note=${note} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasQuantity && hasName) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, quantity=${quantity}, encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasNote && hasName) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, note=${note}, encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasPosition) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, position=${position} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasQuantity) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, quantity=${quantity} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasNote) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, note=${note} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else if (hasName) {
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt}, encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                } else {
                    // status only
                    [updated] = await sql`UPDATE shopcoupon.shopping_items SET status=${status}, bought_at=${boughtAt} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
                }
            } else if (hasPosition && hasQuantity && hasNote && hasName) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET position=${position}, quantity=${quantity}, note=${note}, encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasPosition && hasQuantity && hasNote) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET position=${position}, quantity=${quantity}, note=${note} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasPosition && hasQuantity) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET position=${position}, quantity=${quantity} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasPosition && hasNote) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET position=${position}, note=${note} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasPosition && hasName) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET position=${position}, encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasQuantity && hasNote && hasName) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET quantity=${quantity}, note=${note}, encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasQuantity && hasNote) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET quantity=${quantity}, note=${note} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasQuantity && hasName) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET quantity=${quantity}, encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasNote && hasName) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET note=${note}, encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasPosition) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET position=${position} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasQuantity) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET quantity=${quantity} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasNote) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET note=${note} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            } else if (hasName) {
                [updated] = await sql`UPDATE shopcoupon.shopping_items SET encrypted_name=${encrypted_name} WHERE id=${itemId} AND list_id=${listId} RETURNING *`;
            }

            console.log(`[shopping-items PATCH] DB result: updated=`, JSON.stringify(updated));

            if (!updated) {
                console.warn(`[shopping-items PATCH] Item not found: itemId=${itemId}, listId=${listId}`);
                return { statusCode: 404, body: JSON.stringify({ error: 'Item not found or access denied.' }) };
            }

            // Notify members
            await notifyMembers(sql, listId, userId, 'updateItem', {
                title: `${listName}: Item Updated`,
                body: `Item updated: ${updated.encrypted_name}`,
                url: `/shopping-list/${listId}`
            });

            console.log(`[shopping-items PATCH] Success. Returning updated item id=${updated.id}, status=${updated.status}`);
            return { statusCode: 200, body: JSON.stringify(updated) };
        }

        if (method === 'DELETE') {
            const itemId = event.queryStringParameters?.id;
            if (!itemId) return { statusCode: 400, body: JSON.stringify({ error: 'Item ID is required.' }) };

            console.log(`[shopping-items DELETE] itemId=${itemId}, listId=${listId}`);

            // Get item name before delete
            const [item] = await sql`SELECT encrypted_name FROM shopcoupon.shopping_items WHERE id = ${itemId} AND list_id = ${listId}`;

            if (!item) {
                console.warn(`[shopping-items DELETE] Item not found: itemId=${itemId}`);
                return { statusCode: 404, body: JSON.stringify({ error: 'Item not found or access denied.' }) };
            }

            await sql`
                DELETE FROM shopcoupon.shopping_items 
                WHERE id = ${itemId} AND list_id = ${listId}
            `;

            console.log(`[shopping-items DELETE] Deleted item id=${itemId}`);

            // Notify members
            await notifyMembers(sql, listId, userId, 'removeItem', {
                title: `${listName}: Item Removed`,
                body: `Item removed: ${item.encrypted_name}`,
                url: `/shopping-list/${listId}`
            });

            return { statusCode: 204, body: '' };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error('[shopping-items] Error:', error.message);
        console.error('[shopping-items] Stack:', error.stack);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack 
            }) 
        };
    }
};
