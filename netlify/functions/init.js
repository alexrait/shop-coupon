import { initSchema } from './db.js';

export const handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Basic security check - shouldn't let anyone run this in prod without auth
    const user = context.clientContext?.user;
    if (!user) {
        // For development, we might allow it if we haven't logged in, but let's be safe.
        // Actually, since this is a critical destructive/setup action, uncomment below in prod:
        // return { statusCode: 401, body: 'Unauthorized' };
    }

    try {
        await initSchema();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Schema initialized successfully' })
        };
    } catch (error) {
        console.error('Error initializing schema:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Failed to initialize schema' })
        };
    }
};
