/**
 * Overlap protection for scheduled cron routes.
 *
 * GitHub Actions invokes crons with `--retry 2` and schedules can overlap a
 * slow tick — without a lock, two ticks double-send reminders, double-run
 * automations, or race the expiry worker. The lock is `SET NX` with a TTL via
 * Upstash Redis when configured, otherwise a process-local fallback (correct
 * for single-instance dev; production requires Upstash like rate limiting).
 */

type LockRecord = {
  expiresAt: number;
};

const memoryLocks = new Map<string, LockRecord>();

function acquireMemoryLock(key: string, ttlSeconds: number): boolean {
  const now = Date.now();
  const existing = memoryLocks.get(key);
  if (existing && existing.expiresAt > now) return false;
  memoryLocks.set(key, { expiresAt: now + ttlSeconds * 1000 });
  return true;
}

function releaseMemoryLock(key: string): void {
  memoryLocks.delete(key);
}

async function acquireUpstashLock(key: string, ttlSeconds: number): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    const acquired = await redis.set(key, "1", { nx: true, ex: ttlSeconds });
    return acquired === "OK";
  } catch (error) {
    console.error("[cron-lock] Upstash unavailable, falling back to memory", error);
    return null;
  }
}

async function releaseUpstashLock(key: string): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    const { Redis } = await import("@upstash/redis");
    await new Redis({ url, token }).del(key);
  } catch (error) {
    console.error("[cron-lock] Upstash release failed", error);
  }
}

export type CronLock = {
  /** False when another tick holds the lock — caller should skip with `{ locked: true }`. */
  locked: boolean;
  release: () => Promise<void>;
};

export async function acquireCronLock(name: string, ttlSeconds = 600): Promise<CronLock> {
  const key = `dinaya:cron-lock:${name}`;

  const upstash = await acquireUpstashLock(key, ttlSeconds);
  if (upstash !== null) {
    return {
      locked: upstash,
      release: async () => {
        if (upstash) await releaseUpstashLock(key);
      },
    };
  }

  const locked = acquireMemoryLock(key, ttlSeconds);
  return {
    locked,
    release: async () => {
      if (locked) releaseMemoryLock(key);
    },
  };
}
