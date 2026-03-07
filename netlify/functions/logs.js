import { getDb, ensureDbReady } from './db.js';

export const handler = async (event, context) => {
    const user = context.clientContext?.user;
    if (!user) return { statusCode: 401, body: 'Unauthorized' };

    const sql = getDb();
    const userId = user.sub;
    const listId = event.queryStringParameters?.list_id;

    if (!listId) return { statusCode: 400, body: 'list_id required' };

    try {
        await ensureDbReady(sql, user);

        // Security check: ensure user has access to this list
        const [access] = await sql`
            SELECT 1 FROM shopcoupon.lists l
            LEFT JOIN shopcoupon.list_members lm ON l.id = lm.list_id
            WHERE l.id = ${listId} AND (l.owner_id = ${userId} OR lm.user_id = ${userId})
        `;

        if (!access) {
            return { statusCode: 403, body: 'Forbidden - No access to this vault' };
        }

        const logs = await sql`
            SELECT al.*
            FROM shopcoupon.action_logs al
            LEFT JOIN shopcoupon.coupons c ON al.coupon_id = c.id
            WHERE al.list_id = ${listId}
            ORDER BY al.created_at DESC
            LIMIT 50
        `;
        return { statusCode: 200, body: JSON.stringify(logs) };
    } catch (error) {
        console.error('Logs API error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack 
            }) 
        };
    }
};
