import { describe, expect, it } from "vitest";
import { normalizeReportsRange, parseReportRangePreset } from "@/lib/dashboard/reports";

describe("parseReportRangePreset", () => {
  it("accepts 7d, 30d, and 90d aliases", () => {
    expect(parseReportRangePreset("7d")).toBe("7d");
    expect(parseReportRangePreset("7")).toBe("7d");
    expect(parseReportRangePreset("30d")).toBe("30d");
    expect(parseReportRangePreset("90")).toBe("90d");
    expect(parseReportRangePreset("week")).toBeNull();
  });
});

describe("normalizeReportsRange", () => {
  const now = new Date("2026-09-09T12:00:00+05:30");

  it("defaults to the last 30 local days", () => {
    expect(normalizeReportsRange({ now, timezone: "Asia/Colombo" })).toEqual({
      from: "2026-08-11",
      to: "2026-09-09",
    });
  });

  it("applies 7d and 90d presets when from/to are omitted", () => {
    expect(normalizeReportsRange({ now, preset: "7d", timezone: "Asia/Colombo" })).toEqual({
      from: "2026-09-03",
      to: "2026-09-09",
    });
    expect(normalizeReportsRange({ now, preset: "90d", timezone: "Asia/Colombo" })).toEqual({
      from: "2026-06-12",
      to: "2026-09-09",
    });
  });

  it("lets explicit from/to win over a preset", () => {
    expect(
      normalizeReportsRange({
        from: "2026-05-01",
        now,
        preset: "7d",
        timezone: "Asia/Colombo",
        to: "2026-05-28",
      }),
    ).toEqual({
      from: "2026-05-01",
      to: "2026-05-28",
    });
  });
});
