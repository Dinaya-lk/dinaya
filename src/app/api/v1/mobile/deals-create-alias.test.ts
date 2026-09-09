import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: vi.fn(async () => undefined),
}));

import { POST as desktopDealsPOST } from "@/app/api/v1/desktop/deals/route";
import { POST as mobileDealsPOST } from "@/app/api/v1/mobile/deals/route";

describe("mobile deals create alias", () => {
  it("aliases deals POST without duplicating logic", () => {
    expect(mobileDealsPOST).toBe(desktopDealsPOST);
  });
});
