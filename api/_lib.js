import { createClient } from 'redis';

export const QUEUE_KEY = 'pi:queue';

/* One connection per function instance, reused across requests and rebuilt if it drops. */
let clientPromise = null;

function getRedis() {
    if (!clientPromise) {
        const client = createClient({ url: process.env.REDIS_URL });
        client.on('error', (err) => console.error('Redis connection error:', err));
        clientPromise = client.connect().catch((err) => {
            clientPromise = null;
            throw err;
        });
    }
    return clientPromise;
}

export function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        }
    });
}

/* Runs a Redis-backed handler and turns any storage failure into a logged, readable 503. */
export async function withRedis(handler) {
    if (!process.env.REDIS_URL) {
        console.error('REDIS_URL is not set for this deployment.');
        return json({ ok: false, error: 'Message store is not configured.' }, 503);
    }
    try {
        return await handler(await getRedis());
    } catch (err) {
        console.error('Redis request failed:', err);
        clientPromise = null;
        return json({ ok: false, error: 'Message store is unavailable, please try again later.' }, 503);
    }
}
