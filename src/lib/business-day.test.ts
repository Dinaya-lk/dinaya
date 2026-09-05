import { describe, expect, it } from "vitest";
import { zonedDayRange } from "./business-day";

describe("zonedDayRange", () => {
  it("uses the business timezone, not UTC midnight", () => {
    // 18:45 UTC is 00:15 the next day in Colombo (UTC+5:30).
    const now = new Date("2026-09-05T18:45:00.000Z");
    const { start, end } = zonedDayRange(now, "Asia/Colombo");

    expect(start.toISOString()).toBe("2026-09-05T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-09-06T18:30:00.000Z");
  });
});
