// Simple in-memory, IP-based, fixed-window rate limiter.
//
// This is intentionally lightweight per Phase 16 of the build spec: "simple
// in-memory/IP-based limiter is fine given serverless constraints." It is
// NOT durable across function cold starts/instances — if you outgrow this
// (multi-region, high traffic), swap for Upstash Redis or Vercel's built-in
// rate limiting without changing the call sites below.

interface Bucket {
  count: number;
  resetAt: number; // epoch ms when this window resets
}

const buckets = new Map<string, Bucket>();

// Periodically drop stale buckets so the Map doesn't grow unbounded across
// a long-lived serverless instance.
function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param key       Unique bucket key, e.g. `login:${ip}` or `exam-start:${ip}:${testCode}`.
 * @param limit     Max requests allowed within the window.
 * @param windowMs  Window length in ms.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (now - lastSweep > SWEEP_INTERVAL_MS) {
    sweep(now);
    lastSweep = now;
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  return { allowed, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

/**
 * Best-effort client IP extraction behind Vercel's proxy.
 * Falls back to a constant so unknown-IP requests still share one bucket
 * rather than bypassing the limiter entirely.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}