import { getDb, ensureDbReady } from './db.js';

export const handler = async (event, context) => {
    const user = context.clientContext?.user;
    if (!user) return { statusCode: 401, body: 'Unauthorized' };

    const sql = getDb();
    const userId = user.sub;
    const listId = event.queryStringParameters?.list_id;

    try {
        await ensureDbReady(sql, user);

        let logs;
        
        if (listId) {
            // Security check: ensure user has access to this list
            const [access] = await sql`
                SELECT 1 FROM shopcoupon.lists l
                LEFT JOIN shopcoupon.list_members lm ON l.id = lm.list_id
                WHERE l.id = ${listId} AND (l.owner_id = ${userId} OR lm.user_id = ${userId})
            `;

            if (!access) {
                return { statusCode: 403, body: 'Forbidden - No access to this vault' };
            }

            logs = await sql`
                SELECT al.*
                FROM shopcoupon.action_logs al
                LEFT JOIN shopcoupon.coupons c ON al.coupon_id = c.id
                WHERE al.list_id = ${listId}
                ORDER BY al.created_at DESC
                LIMIT 50
            `;
        } else {
            // Get all logs for all vaults and shopping lists the user has access to
            logs = await sql`
                SELECT al.*, l.name as list_name,
                    CASE WHEN al.coupon_id IS NOT NULL THEN 'vault' ELSE 'shopping' END as list_type
                FROM shopcoupon.action_logs al
                LEFT JOIN shopcoupon.lists l ON al.list_id = l.id AND l.owner_id = ${userId}
                LEFT JOIN shopcoupon.list_members lm ON al.list_id = lm.list_id AND lm.user_id = ${userId}
                LEFT JOIN shopcoupon.shopping_lists sl ON al.list_id = sl.id
                LEFT JOIN shopcoupon.shopping_list_members slm ON al.list_id = slm.list_id AND slm.user_id = ${userId}
                WHERE l.owner_id = ${userId} OR lm.user_id = ${userId}
                   OR sl.owner_id = ${userId} OR slm.user_id = ${userId}
                ORDER BY al.created_at DESC
                LIMIT 100
            `;
        }
        
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
