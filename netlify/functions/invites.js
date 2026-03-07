import { getDb, ensureDbReady } from './db.js';

export const handler = async (event, context) => {
    const user = context.clientContext?.user;
    if (!user) return { statusCode: 401, body: 'Unauthorized' };

    const sql = getDb();
    const userId = user.sub;
    const method = event.httpMethod;

    try {
        await ensureDbReady(sql, user);

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
