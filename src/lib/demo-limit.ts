// Single-instance demo protection only. Authenticated production requests use PostgreSQL atomic limits.
const buckets = new Map<string, { count: number; until: number }>();
export function demoLimit(key: string, now = Date.now()) {
  for (const [k, b] of buckets) if (b.until <= now) buckets.delete(k);
  if (!buckets.has(key) && buckets.size >= 10000) return false;
  const bucket = buckets.get(key) || { count: 0, until: now + 60000 };
  bucket.count++;
  buckets.set(key, bucket);
  return bucket.count <= 30;
}
