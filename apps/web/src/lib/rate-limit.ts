/**
 * Simple in-memory rate limiter.
 * Limits requests per IP within a sliding window.
 * Resets on server restart (acceptable for MVP).
 */

const requests = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute per IP

export function rateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = requests.get(ip) || [];

  // Remove expired timestamps
  const valid = timestamps.filter((t) => now - t < WINDOW_MS);

  if (valid.length >= MAX_REQUESTS) {
    requests.set(ip, valid);
    return { allowed: false, remaining: 0 };
  }

  valid.push(now);
  requests.set(ip, valid);

  return { allowed: true, remaining: MAX_REQUESTS - valid.length };
}
