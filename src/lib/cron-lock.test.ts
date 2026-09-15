import { beforeEach, describe, expect, it } from "vitest";
import { acquireCronLock } from "@/lib/cron-lock";

describe("acquireCronLock (memory fallback)", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("grants the first acquirer and rejects overlapping ticks", async () => {
    const first = await acquireCronLock("test-job", 60);
    expect(first.locked).toBe(true);

    const second = await acquireCronLock("test-job", 60);
    expect(second.locked).toBe(false);
    await second.release();

    await first.release();
    const third = await acquireCronLock("test-job", 60);
    expect(third.locked).toBe(true);
    await third.release();
  });
});
