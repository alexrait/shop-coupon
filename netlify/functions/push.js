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
            const { subscription } = JSON.parse(event.body);

            if (!subscription) {
                return { statusCode: 400, body: 'subscription required' };
            }

            // Store or update the subscription
            await sql`
                INSERT INTO shopcoupon.push_subscriptions (user_id, subscription)
                VALUES (${userId}, ${JSON.stringify(subscription)})
                ON CONFLICT DO NOTHING
            `;

            return { statusCode: 200, body: JSON.stringify({ message: 'Subscribed successfully' }) };
        }

        if (method === 'DELETE') {
            const { endpoint } = JSON.parse(event.body);

            if (!endpoint) {
                return { statusCode: 400, body: 'endpoint required' };
            }

            await sql`
                DELETE FROM shopcoupon.push_subscriptions 
                WHERE user_id = ${userId} 
                AND subscription->>'endpoint' = ${endpoint}
            `;

            return { statusCode: 200, body: JSON.stringify({ message: 'Unsubscribed successfully' }) };
        }

        if (method === 'GET') {
            const subs = await sql`
                SELECT subscription FROM shopcoupon.push_subscriptions 
                WHERE user_id = ${userId}
            `;

            return { statusCode: 200, body: JSON.stringify(subs.map(s => s.subscription)) };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error('Push API error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack 
            }) 
        };
    }
};
