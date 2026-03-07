import { getDb, ensureDbReady } from './db.js';
import webpush from 'web-push';

// In production, these should be environment variables:
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:example@example.com';

if (vapidPrivateKey && vapidPrivateKey !== 'your-private-key-here') {
    try {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } catch (err) {
        console.error('Failed to set VAPID details:', err);
    }
}

export const notifyMembers = async (sql, listId, excludeUserId, type, payload) => {
    if (!vapidPrivateKey || vapidPrivateKey === 'your-private-key-here') {
        console.warn('VAPID_PRIVATE_KEY not set. Skipping notification.');
        return;
    }
    try {
        // Find all members of the list
        const members = await sql`
            SELECT DISTINCT u.id 
            FROM shopcoupon.users u
            JOIN shopcoupon.shopping_lists sl ON sl.id = ${listId}
            LEFT JOIN shopcoupon.shopping_list_members slm ON sl.id = slm.list_id
            WHERE (sl.owner_id = u.id OR slm.user_id = u.id)
            AND u.id != ${excludeUserId}
        `;

        if (members.length === 0) return;

        const userIds = members.map(m => m.id);

        // Find all subscriptions for these users that have the setting enabled
        const subs = await sql`
            SELECT subscription, settings 
            FROM shopcoupon.push_subscriptions 
            WHERE user_id = ANY(${userIds})
        `;

        const typeMap = {
            'addItem': 'newItem',
            'removeItem': 'removeItem',
            'updateItem': 'updateItem'
        };

        const settingKey = typeMap[type];

        for (const s of subs) {
            const settings = s.settings || { newItem: true, removeItem: true, updateItem: true };
            if (settings[settingKey]) {
                try {
                    await webpush.sendNotification(
                        s.subscription, 
                        JSON.stringify(payload)
                    );
                } catch (err) {
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        // Expired subscription, delete it
                        await sql`
                            DELETE FROM shopcoupon.push_subscriptions 
                            WHERE subscription->>'endpoint' = ${s.subscription.endpoint}
                        `;
                    } else {
                        console.error('Push send error:', err);
                    }
                }
            }
        }
    } catch (err) {
        console.error('Notify members error:', err);
    }
};

export const handler = async (event, context) => {
    const user = context.clientContext?.user;
    if (!user) return { statusCode: 401, body: 'Unauthorized' };

    const sql = getDb();
    const userId = user.sub;
    const method = event.httpMethod;

    try {
        await ensureDbReady(sql, user);

        if (method === 'POST') {
            const { subscription, settings } = JSON.parse(event.body);

            if (subscription) {
                // Store or update the subscription
                await sql`
                    INSERT INTO shopcoupon.push_subscriptions (user_id, subscription, settings)
                    VALUES (${userId}, ${JSON.stringify(subscription)}, ${JSON.stringify(settings || { newItem: true, removeItem: true, updateItem: true })})
                    ON CONFLICT (user_id, ((subscription->>'endpoint'))) DO UPDATE 
                    SET subscription = EXCLUDED.subscription, settings = COALESCE(EXCLUDED.settings, push_subscriptions.settings)
                `;
            } else if (settings) {
                // Update settings for all user's subscriptions
                await sql`
                    UPDATE shopcoupon.push_subscriptions 
                    SET settings = ${JSON.stringify(settings)}
                    WHERE user_id = ${userId}
                `;
            }

            return { statusCode: 200, body: JSON.stringify({ message: 'Push settings updated' }) };
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
            const [sub] = await sql`
                SELECT subscription, settings FROM shopcoupon.push_subscriptions 
                WHERE user_id = ${userId}
                LIMIT 1
            `;

            return { statusCode: 200, body: JSON.stringify(sub || null) };
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
