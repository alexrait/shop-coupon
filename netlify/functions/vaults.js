import { getDb, ensureDbReady } from './db.js';

export const handler = async (event, context) => {
    const user = context.clientContext?.user;
    if (!user) return { statusCode: 401, body: 'Unauthorized' };

    const sql = getDb();
    const userId = user.sub;
    const userEmail = user.email;
    const method = event.httpMethod;

    try {
        await ensureDbReady(sql, user);

        if (method === 'GET') {
            // Get all vaults owned by user OR where user is a member
            const vaults = await sql`
                SELECT DISTINCT l.* 
                FROM shopcoupon.lists l
                LEFT JOIN shopcoupon.list_members lm ON l.id = lm.list_id
                WHERE l.owner_id = ${userId} OR lm.user_id = ${userId}
                ORDER BY l.created_at DESC
            `;
            return {
                statusCode: 200,
                body: JSON.stringify(vaults)
            };
        }

        if (method === 'POST') {
            const body = JSON.parse(event.body);
            const { name, salt, encrypted_private_key, iv, public_key } = body;

            const [newVault] = await sql`
                INSERT INTO shopcoupon.lists 
                (owner_id, name, salt, encrypted_private_key, iv, public_key)
                VALUES (${userId}, ${name}, ${salt}, ${encrypted_private_key}, ${iv}, ${public_key})
                RETURNING *
            `;
            return {
                statusCode: 201,
                body: JSON.stringify(newVault)
            };
        }

        if (method === 'PATCH') {
            const listId = event.queryStringParameters?.list_id;
            const body = JSON.parse(event.body);
            const { name } = body;

            if (!listId || !name) return { statusCode: 400, body: 'list_id and name required' };

            // Update only if owner
            const [updated] = await sql`
                UPDATE shopcoupon.lists 
                SET name = ${name}
                WHERE id = ${listId} AND owner_id = ${userId}
                RETURNING *
            `;

            if (!updated) return { statusCode: 403, body: 'Forbidden or not found' };

            return {
                statusCode: 200,
                body: JSON.stringify(updated)
            };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error('Vaults API error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack 
            }) 
        };
    }
};
