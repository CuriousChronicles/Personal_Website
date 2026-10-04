import { createHash, timingSafeEqual } from 'node:crypto';
import { redis, json, QUEUE_KEY } from './_lib.js';

const BATCH_SIZE = 10;

function isAuthorised(request) {
    const expected = process.env.PI_TOKEN;
    if (!expected) return false;
    const header = request.headers.get('authorization') || '';
    const given = header.startsWith('Bearer ') ? header.slice(7) : '';
    /* Hashing first gives equal-length buffers, which timingSafeEqual requires. */
    const a = createHash('sha256').update(given).digest();
    const b = createHash('sha256').update(expected).digest();
    return timingSafeEqual(a, b);
}

/* Polled by the Raspberry Pi. Popping removes the messages, so each one is delivered at most once. */
export async function GET(request) {
    if (!isAuthorised(request)) {
        return json({ error: 'Unauthorised.' }, 401);
    }
    const messages = await redis.lpop(QUEUE_KEY, BATCH_SIZE);
    return json({ messages: messages || [] });
}
