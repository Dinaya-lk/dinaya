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

import { GET as desktopBroadcastsGET, POST as desktopBroadcastsPOST } from "@/app/api/v1/desktop/broadcasts/route";
import { GET as mobileBroadcastsGET, POST as mobileBroadcastsPOST } from "@/app/api/v1/mobile/broadcasts/route";

describe("mobile broadcast create alias", () => {
  it("aliases POST /broadcasts without duplicating logic", () => {
    expect(mobileBroadcastsPOST).toBe(desktopBroadcastsPOST);
  });

  it("does not alias broadcasts GET to the desktop list payload", () => {
    expect(mobileBroadcastsGET).not.toBe(desktopBroadcastsGET);
  });
});
