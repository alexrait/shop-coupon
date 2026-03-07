import { getDb, ensureDbReady } from './db.js';

export const handler = async (event, context) => {
    const user = context.clientContext?.user;
    if (!user) return { statusCode: 401, body: 'Unauthorized' };

    const sql = getDb();
    const userId = user.sub;
    const method = event.httpMethod;

    try {
        await ensureDbReady(sql, user);

        if (method === 'GET') {
            const listId = event.queryStringParameters?.list_id;
            const listType = event.queryStringParameters?.list_type;
            const isShoppingList = listType === 'shopping';

            if (!listId) return { statusCode: 400, body: 'list_id required' };

            let members;
            let listInfo;

            if (isShoppingList) {
                [listInfo] = await sql`SELECT owner_id FROM shopcoupon.shopping_lists WHERE id = ${listId}`;
                members = await sql`
                    SELECT u.id, u.email 
                    FROM shopcoupon.users u
                    JOIN shopcoupon.shopping_list_members slm ON u.id = slm.user_id
                    WHERE slm.list_id = ${listId}
                `;
            } else {
                [listInfo] = await sql`SELECT owner_id FROM shopcoupon.lists WHERE id = ${listId}`;
                members = await sql`
                    SELECT u.id, u.email 
                    FROM shopcoupon.users u
                    JOIN shopcoupon.list_members lm ON u.id = lm.user_id
                    WHERE lm.list_id = ${listId}
                `;
            }

            return { 
                statusCode: 200, 
                body: JSON.stringify({ 
                    members, 
                    owner_id: listInfo?.owner_id 
                }) 
            };
        }

        if (method === 'POST') {
            const { list_id, email, list_type } = JSON.parse(event.body);

            // list_type: 'vault' or 'shopping'
            const isShoppingList = list_type === 'shopping';

            // 1. Verify requester owns the list
            let list;
            if (isShoppingList) {
                [list] = await sql`SELECT owner_id FROM shopcoupon.shopping_lists WHERE id = ${list_id}`;
            } else {
                [list] = await sql`SELECT owner_id FROM shopcoupon.lists WHERE id = ${list_id}`;
            }

            if (!list || list.owner_id !== userId) {
                return { statusCode: 403, body: 'Only owners can invite others' };
            }

            // 2. Find the invited user
            let [targetUser] = await sql`
                SELECT id FROM shopcoupon.users WHERE email = ${email}
            `;

            if (!targetUser) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'User not found. They must log in to the app once before being invited.' })
                };
            }

            // 3. Add to members
            if (isShoppingList) {
                await sql`
                    INSERT INTO shopcoupon.shopping_list_members (list_id, user_id)
                    VALUES (${list_id}, ${targetUser.id})
                    ON CONFLICT DO NOTHING
                `;
            } else {
                await sql`
                    INSERT INTO shopcoupon.list_members (list_id, user_id)
                    VALUES (${list_id}, ${targetUser.id})
                    ON CONFLICT DO NOTHING
                `;
            }

            return { statusCode: 200, body: JSON.stringify({ message: 'User invited successfully' }) };
        }

        if (method === 'DELETE') {
            const listId = event.queryStringParameters?.list_id;
            const listType = event.queryStringParameters?.list_type;
            const targetUserId = event.queryStringParameters?.user_id;
            const isShoppingList = listType === 'shopping';

            if (!listId || !targetUserId) return { statusCode: 400, body: 'list_id and user_id required' };

            // 1. Verify requester owns the list
            let list;
            if (isShoppingList) {
                [list] = await sql`SELECT owner_id FROM shopcoupon.shopping_lists WHERE id = ${listId}`;
            } else {
                [list] = await sql`SELECT owner_id FROM shopcoupon.lists WHERE id = ${listId}`;
            }

            if (!list || list.owner_id !== userId) {
                return { statusCode: 403, body: 'Only owners can remove members' };
            }

            // 2. Remove
            if (isShoppingList) {
                await sql`
                    DELETE FROM shopcoupon.shopping_list_members 
                    WHERE list_id = ${listId} AND user_id = ${targetUserId}
                `;
            } else {
                await sql`
                    DELETE FROM shopcoupon.list_members 
                    WHERE list_id = ${listId} AND user_id = ${targetUserId}
                `;
            }

            return { statusCode: 200, body: JSON.stringify({ message: 'Member removed' }) };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error('Invites API error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack 
            }) 
        };
    }
};
