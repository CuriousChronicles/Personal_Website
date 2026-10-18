import { Redis } from '@upstash/redis';

/* The Vercel Marketplace integration names these KV_REST_API_*, a direct Upstash setup names them UPSTASH_REDIS_REST_*. */
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (!url || !token) {
    /* Names only, never values, so the logs show which variables the integration actually created. */
    const found = Object.keys(process.env).filter(k => /KV|REDIS|UPSTASH/i.test(k));
    console.error(`Redis REST URL/token not found. Redis-related env vars present: ${found.join(', ') || 'none'}`);
}

export const redis = url && token ? new Redis({ url, token }) : null;

export const QUEUE_KEY = 'pi:queue';

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
    if (!redis) {
        return json({ ok: false, error: 'Message store is not configured.' }, 503);
    }
    try {
        return await handler();
    } catch (err) {
        console.error('Redis request failed:', err);
        return json({ ok: false, error: 'Message store is unavailable, please try again later.' }, 503);
    }
}
