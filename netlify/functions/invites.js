import { getDb } from './db.js';

export const handler = async (event, context) => {
    const user = context.clientContext?.user;
    if (!user) return { statusCode: 401, body: 'Unauthorized' };

    const sql = getDb();
    const userId = user.sub;
    const method = event.httpMethod;

    try {
        if (method === 'POST') {
            const { list_id, email } = JSON.parse(event.body);

            // 1. Verify requester owns the vault
            const [vault] = await sql`
                SELECT owner_id FROM shopcoupon.lists WHERE id = ${list_id}
            `;

            if (!vault || vault.owner_id !== userId) {
                return { statusCode: 403, body: 'Only owners can invite others' };
            }

            // 2. Find or create the invited user in our users table
            // In a real app, we might send an email invite if they don't exist.
            // For now, we assume they might exist or will exist when they log in.

            // Try to find user by email
            let [targetUser] = await sql`
                SELECT id FROM shopcoupon.users WHERE email = ${email}
            `;

            if (!targetUser) {
                // If they don't exist, we can't share by ID yet. 
                // A better approach would be to store pending invites by email.
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'User not found. They must log in to the app once before being invited.' })
                };
            }

            // 3. Add to list_members
            await sql`
                INSERT INTO shopcoupon.list_members (list_id, user_id)
                VALUES (${list_id}, ${targetUser.id})
                ON CONFLICT DO NOTHING
            `;

            return { statusCode: 200, body: JSON.stringify({ message: 'User invited successfully' }) };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error('Invites API error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
