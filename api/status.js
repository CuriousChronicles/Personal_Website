import { json, withRedis, QUEUE_KEY, LAST_SEEN_KEY, BLINKS_KEY } from './_lib.js';

/* The Pi polls every 10 s and backs off on errors, so a minute of silence means it's offline. */
const ONLINE_WINDOW_MS = 60_000;

/* Public: drives the online light and blink counter on the home page. */
export async function GET() {
    return withRedis(async (redis) => {
        const [lastSeen, blinks] = await redis.mGet([LAST_SEEN_KEY, BLINKS_KEY]);
        const queued = await redis.lLen(QUEUE_KEY);
        const seen = lastSeen ? Number(lastSeen) : null;
        return json(
            {
                online: seen !== null && Date.now() - seen < ONLINE_WINDOW_MS,
                lastSeen: seen,
                blinks: Number(blinks) || 0,
                queued
            },
            200,
            /* Lets Vercel's CDN answer most visitors' polls without running the function. */
            'public, s-maxage=5, stale-while-revalidate=10'
        );
    });
}
