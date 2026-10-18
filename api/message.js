import { json, withRedis, QUEUE_KEY } from './_lib.js';

const MAX_MESSAGE = 140;
const MAX_NAME = 30;
const MAX_PER_MINUTE = 3;
const MAX_QUEUE = 50;

/* Drops control characters so nothing odd reaches the Pi's terminal or screen. */
function clean(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ ok: false, error: 'Invalid request.' }, 400);
    }
    if (!body || typeof body !== 'object') {
        return json({ ok: false, error: 'Invalid request.' }, 400);
    }

    /* Honeypot: real visitors never see this field, so pretend it worked and drop it. */
    if (body.website) {
        return json({ ok: true });
    }

    if (typeof body.message === 'string' && body.message.trim().length > MAX_MESSAGE) {
        return json({ ok: false, error: `Message must be ${MAX_MESSAGE} characters or fewer.` }, 400);
    }
    const message = clean(body.message, MAX_MESSAGE);
    const name = clean(body.name, MAX_NAME);
    if (!message) {
        return json({ ok: false, error: 'Message is required.' }, 400);
    }

    return withRedis(async (redis) => {
        const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
        const rateKey = `rl:${ip}`;
        const count = await redis.incr(rateKey);
        if (count === 1) {
            await redis.expire(rateKey, 60);
        }
        if (count > MAX_PER_MINUTE) {
            return json({ ok: false, error: 'Too many messages, try again in a minute.' }, 429);
        }

        /* Stops a flood from filling Redis while the Pi is switched off. */
        if (await redis.lLen(QUEUE_KEY) >= MAX_QUEUE) {
            return json({ ok: false, error: 'The queue is full, try again later.' }, 503);
        }

        await redis.rPush(QUEUE_KEY, JSON.stringify({ name, message, ts: Date.now() }));
        return json({ ok: true });
    });
}
