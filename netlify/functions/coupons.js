import { getDb } from './db.js';

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
        // Security check: ensure user has access to this list
        const [access] = await sql`
            SELECT 1 FROM shopcoupon.lists l
            LEFT JOIN shopcoupon.list_members lm ON l.id = lm.list_id
            WHERE l.id = ${listId} AND (l.owner_id = ${userId} OR lm.user_id = ${userId})
        `;

        if (!access) {
            return { statusCode: 403, body: 'Forbidden - No access to this vault' };
        }

        if (method === 'GET') {
            const coupons = await sql`
                SELECT * FROM shopcoupon.coupons 
                WHERE list_id = ${listId} AND deleted_at IS NULL
                ORDER BY created_at DESC
            `;
            return { statusCode: 200, body: JSON.stringify(coupons) };
        }

        if (method === 'POST') {
            const body = JSON.parse(event.body);
            const { encrypted_payload } = body;

            const [newCoupon] = await sql`
                INSERT INTO shopcoupon.coupons (list_id, encrypted_payload)
                VALUES (${listId}, ${encrypted_payload})
                RETURNING *
            `;

            // Log the action
            await sql`
                INSERT INTO shopcoupon.action_logs (user_id, list_id, coupon_id, action_type)
                VALUES (${userId}, ${listId}, ${newCoupon.id}, 'CREATED')
            `;

            return { statusCode: 201, body: JSON.stringify(newCoupon) };
        }

        // DELETE /api/coupons?list_id=...&id=...
        if (method === 'DELETE') {
            const couponId = event.queryStringParameters?.id;
            if (!couponId) return { statusCode: 400, body: 'coupon id required' };

            await sql`
                 UPDATE shopcoupon.coupons SET deleted_at = CURRENT_TIMESTAMP WHERE id = ${couponId} AND list_id = ${listId}
             `;

            await sql`
                INSERT INTO shopcoupon.action_logs (user_id, list_id, coupon_id, action_type)
                VALUES (${userId}, ${listId}, ${couponId}, 'USED')
             `;

            return { statusCode: 204, body: '' };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error('Coupons API error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
