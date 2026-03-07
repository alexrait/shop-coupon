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
            const lists = await sql`
                SELECT DISTINCT sl.* 
                FROM shopcoupon.shopping_lists sl
                LEFT JOIN shopcoupon.shopping_list_members slm ON sl.id = slm.list_id
                WHERE sl.owner_id = ${userId} OR slm.user_id = ${userId}
                ORDER BY sl.created_at DESC
            `;
            return {
                statusCode: 200,
                body: JSON.stringify(lists)
            };
        }

        if (method === 'POST') {
            const body = JSON.parse(event.body);
            const { name } = body;

            const [newList] = await sql`
                INSERT INTO shopcoupon.shopping_lists (owner_id, name)
                VALUES (${userId}, ${name})
                RETURNING *
            `;
            return {
                statusCode: 201,
                body: JSON.stringify(newList)
            };
        }

        if (method === 'PATCH') {
            const listId = event.queryStringParameters?.list_id;
            const body = JSON.parse(event.body);
            const { name } = body;

            if (!listId || !name) return { statusCode: 400, body: 'list_id and name required' };

            const [updated] = await sql`
                UPDATE shopcoupon.shopping_lists 
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

        if (method === 'DELETE') {
            const listId = event.queryStringParameters?.list_id;
            if (!listId) return { statusCode: 400, body: 'list_id required' };

            await sql`
                DELETE FROM shopcoupon.shopping_lists 
                WHERE id = ${listId} AND owner_id = ${userId}
            `;

            return { statusCode: 204, body: '' };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error('Shopping Lists API error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack 
            }) 
        };
    }
};
