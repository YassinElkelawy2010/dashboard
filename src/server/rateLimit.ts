type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, opts: { limit: number; windowMs: number }) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true as const, remaining: opts.limit - 1, resetAt: now + opts.windowMs };
  }

  if (existing.count >= opts.limit) {
    return { ok: false as const, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true as const, remaining: opts.limit - existing.count, resetAt: existing.resetAt };
}
