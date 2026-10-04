import { Redis } from '@upstash/redis';

/* The Vercel Marketplace integration names these KV_REST_API_*, a direct Upstash setup names them UPSTASH_REDIS_REST_*. */
export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
});

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
