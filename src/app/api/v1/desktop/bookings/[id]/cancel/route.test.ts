import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireDesktopWriteMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const cancelDeviceBookingMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopWrite: requireDesktopWriteMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/lib/dashboard/device-bookings", () => ({
  cancelDeviceBooking: cancelDeviceBookingMock,
  deviceBookingCancelSchema: {
    safeParse: (value: unknown) => {
      if (!value || typeof value !== "object") {
        return { success: true, data: {} };
      }
      const reason = (value as { reason?: unknown }).reason;
      if (reason === undefined) return { success: true, data: {} };
      if (typeof reason !== "string") return { success: false };
      return { success: true, data: { reason } };
    },
  },
}));

import { POST } from "./route";

const writeAuthOk = {
  ok: true,
  context: {
    businessId: "00000000-0000-4000-8000-000000000001",
    deviceId: "device_1",
    keyId: "key_1",
    keyType: "desktop",
  },
};

describe("POST /api/v1/desktop/bookings/:id/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopWriteMock.mockResolvedValue(writeAuthOk);
  });

  it("returns 401 when desktop write auth is missing", async () => {
    requireDesktopWriteMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/bookings/bk_1/cancel", {
      method: "POST",
      body: JSON.stringify({ reason: "No-show" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "bk_1" }) });

    expect(res.status).toBe(401);
    expect(cancelDeviceBookingMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the booking is missing", async () => {
    cancelDeviceBookingMock.mockResolvedValue({
      status: "not_found",
      error: "Not found.",
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/bookings/bk_1/cancel", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "bk_1" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Not found.");
  });

  it("cancels the booking and returns revision metadata", async () => {
    cancelDeviceBookingMock.mockResolvedValue({
      status: "cancelled",
      booking: {
        id: "bk_1",
        status: "cancelled",
        revisionTs: "2026-09-04T09:00:00.000Z",
      },
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/bookings/bk_1/cancel", {
      method: "POST",
      body: JSON.stringify({ reason: "Client walked out" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "bk_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      id: "bk_1",
      status: "cancelled",
      revisionTs: "2026-09-04T09:00:00.000Z",
    });
    expect(cancelDeviceBookingMock).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      "bk_1",
      "Client walked out",
      expect.objectContaining({ channel: "desktop" }),
    );
  });
});
