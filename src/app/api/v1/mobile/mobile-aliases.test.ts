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

import { API_KEY_SCOPES } from "@/lib/api-key-scopes";

import { GET as desktopBootstrapGET } from "@/app/api/v1/desktop/bootstrap/route";
import { GET as mobileBootstrapGET } from "@/app/api/v1/mobile/bootstrap/route";
import { GET as desktopOverviewGET } from "@/app/api/v1/desktop/overview/route";
import { GET as mobileOverviewGET } from "@/app/api/v1/mobile/overview/route";
import { GET as desktopCalendarGET } from "@/app/api/v1/desktop/calendar/route";
import { GET as mobileCalendarGET } from "@/app/api/v1/mobile/calendar/route";
import { GET as desktopBookingsGET } from "@/app/api/v1/desktop/bookings/route";
import { GET as mobileBookingsGET } from "@/app/api/v1/mobile/bookings/route";
import { PATCH as desktopStatusPATCH } from "@/app/api/v1/desktop/bookings/[id]/status/route";
import { PATCH as mobileStatusPATCH } from "@/app/api/v1/mobile/bookings/[id]/status/route";
import { GET as desktopModuleGET } from "@/app/api/v1/desktop/[module]/route";
import { GET as mobileModuleGET } from "@/app/api/v1/mobile/[module]/route";
import { POST as desktopLogoutPOST } from "@/app/api/v1/desktop/auth/logout/route";
import { POST as mobileLogoutPOST } from "@/app/api/v1/mobile/auth/logout/route";

describe("mobile route aliases", () => {
  it("exposes the mobile scopes", () => {
    expect(API_KEY_SCOPES).toEqual(
      expect.arrayContaining(["mobile:read", "mobile:bookings", "mobile:write"]),
    );
  });

  it("aliases bootstrap without duplicating logic", () => {
    expect(mobileBootstrapGET).toBe(desktopBootstrapGET);
  });

  it("aliases overview without duplicating logic", () => {
    expect(mobileOverviewGET).toBe(desktopOverviewGET);
  });

  it("aliases calendar without duplicating logic", () => {
    expect(mobileCalendarGET).toBe(desktopCalendarGET);
  });

  it("aliases bookings without duplicating logic", () => {
    expect(mobileBookingsGET).toBe(desktopBookingsGET);
  });

  it("aliases booking status updates without duplicating logic", () => {
    expect(mobileStatusPATCH).toBe(desktopStatusPATCH);
  });

  it("aliases the generic module route without duplicating logic", () => {
    expect(mobileModuleGET).toBe(desktopModuleGET);
  });

  it("aliases logout without duplicating logic", () => {
    expect(mobileLogoutPOST).toBe(desktopLogoutPOST);
  });
});
