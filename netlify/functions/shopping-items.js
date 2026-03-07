import { getDb, ensureDbReady } from './db.js';

export const handler = async (event, context) => {
    const user = context.clientContext?.user;
    if (!user) return { statusCode: 401, body: 'Unauthorized' };

    const sql = getDb();
    const userId = user.sub;
    const method = event.httpMethod;
    const listId = event.queryStringParameters?.list_id;

    if (!listId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'list_id is required' }) };
    }

    try {
        await ensureDbReady(sql, user);

        const [access] = await sql`
            SELECT 1 FROM shopcoupon.shopping_lists sl
            LEFT JOIN shopcoupon.shopping_list_members slm ON sl.id = slm.list_id
            WHERE sl.id = ${listId} AND (sl.owner_id = ${userId} OR slm.user_id = ${userId})
        `;

        if (!access) {
            return { statusCode: 403, body: 'Forbidden - No access to this shopping list' };
        }

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
            return { statusCode: 200, body: JSON.stringify(items) };
        }

        if (method === 'POST') {
            const body = JSON.parse(event.body);
            const { encrypted_name, quantity } = body;

            const [maxPos] = await sql`SELECT COALESCE(MAX(position), 0) as max_p FROM shopcoupon.shopping_items WHERE list_id = ${listId}`;
            const nextPos = (maxPos?.max_p || 0) + 10;

            const [newItem] = await sql`
                INSERT INTO shopcoupon.shopping_items (list_id, encrypted_name, quantity, position)
                VALUES (${listId}, ${encrypted_name}, ${quantity || 1}, ${nextPos})
                RETURNING *
            `;

            return { statusCode: 201, body: JSON.stringify(newItem) };
        }

        if (method === 'PATCH') {
            const itemId = event.queryStringParameters?.id;
            const body = JSON.parse(event.body);
            const { status, position, quantity, note, encrypted_name } = body;

            if (!itemId) return { statusCode: 400, body: 'item id required' };

            const updates = {};
            if (status) {
                updates.status = status;
                if (status === 'bought') {
                    updates.bought_at = new Date();
                } else if (status === 'pending') {
                    updates.bought_at = null;
                }
            }
            if (position !== undefined) updates.position = position;
            if (quantity !== undefined) updates.quantity = quantity;
            if (note !== undefined) updates.note = note;
            if (encrypted_name !== undefined) updates.encrypted_name = encrypted_name;

            if (Object.keys(updates).length === 0) return { statusCode: 400, body: 'nothing to update' };

            const setClauses = [];
            const values = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updates)) {
                setClauses.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }

            values.push(itemId, listId);

            const query = `
                UPDATE shopcoupon.shopping_items 
                SET ${setClauses.join(', ')}
                WHERE id = $${paramIndex} AND list_id = $${paramIndex + 1}
                RETURNING *
            `;

            const [updated] = await sql.query(query, values);

            return { statusCode: 200, body: JSON.stringify(updated) };
        }

        if (method === 'DELETE') {
            const itemId = event.queryStringParameters?.id;
            if (!itemId) return { statusCode: 400, body: 'item id required' };

            await sql`
                DELETE FROM shopcoupon.shopping_items 
                WHERE id = ${itemId} AND list_id = ${listId}
            `;

            return { statusCode: 204, body: '' };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error('Shopping Items API error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack 
            }) 
        };
    }
};
