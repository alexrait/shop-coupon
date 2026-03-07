import { Handler } from '@netlify/functions';
import { initSchema } from './db';

export const handler: Handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Basic security check - shouldn't let anyone run this in prod without auth
    // In a real app we'd check context.clientContext.user or an admin secret

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
            body: JSON.stringify({ error: 'Failed to initialize schema' })
        };
    }
};
