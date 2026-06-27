/**
 * In-memory sliding-window rate limiter for Next.js Edge/Node middleware.
 * Each bucket is keyed by IP + route tag.
 * Not clustered — for a single-process deployment (Docker, Vercel single region).
 * For multi-instance, swap the Map for Redis via @upstash/ratelimit.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Clean up expired entries every 5 minutes to avoid memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store.entries()) {
      if (bucket.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param ip       Client IP address
 * @param tag      Route identifier, e.g. "register" | "login" | "game"
 * @param limit    Max requests per window
 * @param windowMs Window duration in ms
 */
export function rateLimit(
  ip: string,
  tag: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const key = `${ip}:${tag}`;
  const now = Date.now();

  let bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }

  bucket.count += 1;

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}
