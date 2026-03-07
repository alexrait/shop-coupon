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
                WHERE list_id = ${listId} AND status != 'deleted'
                ORDER BY position ASC, created_at DESC
            `;
            return { statusCode: 200, body: JSON.stringify(coupons) };
        }

        if (method === 'POST') {
            const body = JSON.parse(event.body);
            const { encrypted_payload } = body;

            // Get max position for auto-incrementing new coupon position
            const [maxPos] = await sql`SELECT COALESCE(MAX(position), 0) as max_p FROM shopcoupon.coupons WHERE list_id = ${listId}`;
            const nextPos = (maxPos?.max_p || 0) + 10;

            const [newCoupon] = await sql`
                INSERT INTO shopcoupon.coupons (list_id, encrypted_payload, position)
                VALUES (${listId}, ${encrypted_payload}, ${nextPos})
                RETURNING *
            `;

            // Log the action
            await sql`
                INSERT INTO shopcoupon.action_logs (user_id, list_id, coupon_id, action_type)
                VALUES (${userId}, ${listId}, ${newCoupon.id}, 'CREATED')
            `;

            return { statusCode: 201, body: JSON.stringify(newCoupon) };
        }

        // PATCH /api/coupons?list_id=...&id=... (Used for reordering, status, or content updates)
        if (method === 'PATCH') {
            const couponId = event.queryStringParameters?.id;
            const body = JSON.parse(event.body);
            const { status, position, encrypted_payload } = body;

            if (!couponId) return { statusCode: 400, body: 'coupon id required' };

            const updates = {};
            if (status) updates.status = status;
            if (position !== undefined) updates.position = position;
            if (encrypted_payload) updates.encrypted_payload = encrypted_payload;

            if (Object.keys(updates).length === 0) return { statusCode: 400, body: 'nothing to update' };

            let updated;
            if (status && position !== undefined && encrypted_payload) {
                [updated] = await sql`UPDATE shopcoupon.coupons SET status=${status}, position=${position}, encrypted_payload=${encrypted_payload}, updated_at=CURRENT_TIMESTAMP WHERE id=${couponId} AND list_id=${listId} RETURNING *`;
            } else if (status && position !== undefined) {
                [updated] = await sql`UPDATE shopcoupon.coupons SET status=${status}, position=${position}, updated_at=CURRENT_TIMESTAMP WHERE id=${couponId} AND list_id=${listId} RETURNING *`;
            } else if (status && encrypted_payload) {
                [updated] = await sql`UPDATE shopcoupon.coupons SET status=${status}, encrypted_payload=${encrypted_payload}, updated_at=CURRENT_TIMESTAMP WHERE id=${couponId} AND list_id=${listId} RETURNING *`;
            } else if (position !== undefined && encrypted_payload) {
                [updated] = await sql`UPDATE shopcoupon.coupons SET position=${position}, encrypted_payload=${encrypted_payload}, updated_at=CURRENT_TIMESTAMP WHERE id=${couponId} AND list_id=${listId} RETURNING *`;
            } else if (status) {
                [updated] = await sql`UPDATE shopcoupon.coupons SET status=${status}, updated_at=CURRENT_TIMESTAMP WHERE id=${couponId} AND list_id=${listId} RETURNING *`;
            } else if (position !== undefined) {
                [updated] = await sql`UPDATE shopcoupon.coupons SET position=${position}, updated_at=CURRENT_TIMESTAMP WHERE id=${couponId} AND list_id=${listId} RETURNING *`;
            } else if (encrypted_payload) {
                [updated] = await sql`UPDATE shopcoupon.coupons SET encrypted_payload=${encrypted_payload}, updated_at=CURRENT_TIMESTAMP WHERE id=${couponId} AND list_id=${listId} RETURNING *`;
            }

            if (status === 'used') {
                await sql`
                    INSERT INTO shopcoupon.action_logs (user_id, list_id, coupon_id, action_type)
                    VALUES (${userId}, ${listId}, ${couponId}, 'USED')
                `;
            } else if (encrypted_payload) {
                await sql`
                    INSERT INTO shopcoupon.action_logs (user_id, list_id, coupon_id, action_type)
                    VALUES (${userId}, ${listId}, ${couponId}, 'UPDATED')
                `;
            }

            return { statusCode: 200, body: JSON.stringify(updated) };
        }

        // DELETE /api/coupons?list_id=...&id=... (Hard delete - setting status to deleted)
        if (method === 'DELETE') {
            const couponId = event.queryStringParameters?.id;
            if (!couponId) return { statusCode: 400, body: 'coupon id required' };

            await sql`
                 UPDATE shopcoupon.coupons 
                 SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP 
                 WHERE id = ${couponId} AND list_id = ${listId}
             `;

            await sql`
                INSERT INTO shopcoupon.action_logs (user_id, list_id, coupon_id, action_type)
                VALUES (${userId}, ${listId}, ${couponId}, 'DELETED')
             `;

            return { statusCode: 204, body: '' };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error('Coupons API error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack 
            }) 
        };
    }
};
