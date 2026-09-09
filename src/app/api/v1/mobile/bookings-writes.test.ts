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

vi.mock("@/lib/dashboard/device-bookings", () => ({
  createDeviceWalkInBooking: vi.fn(),
  updateDeviceBooking: vi.fn(),
  cancelDeviceBooking: vi.fn(),
}));

import { GET as desktopBookingsGET, POST as desktopBookingsPOST } from "@/app/api/v1/desktop/bookings/route";
import { GET as mobileBookingsGET, POST as mobileBookingsPOST } from "@/app/api/v1/mobile/bookings/route";
import { GET as desktopBookingGET, PATCH as desktopBookingPATCH } from "@/app/api/v1/desktop/bookings/[id]/route";
import { GET as mobileBookingGET, PATCH as mobileBookingPATCH } from "@/app/api/v1/mobile/bookings/[id]/route";
import { POST as desktopCancelPOST } from "@/app/api/v1/desktop/bookings/[id]/cancel/route";
import { POST as mobileCancelPOST } from "@/app/api/v1/mobile/bookings/[id]/cancel/route";

describe("mobile booking write aliases", () => {
  it("aliases POST /bookings without duplicating logic", () => {
    expect(mobileBookingsPOST).toBe(desktopBookingsPOST);
    expect(mobileBookingsGET).toBe(desktopBookingsGET);
  });

  it("aliases GET+PATCH /bookings/:id without duplicating logic", () => {
    expect(mobileBookingGET).toBe(desktopBookingGET);
    expect(mobileBookingPATCH).toBe(desktopBookingPATCH);
  });

  it("aliases POST /bookings/:id/cancel without duplicating logic", () => {
    expect(mobileCancelPOST).toBe(desktopCancelPOST);
  });
});
