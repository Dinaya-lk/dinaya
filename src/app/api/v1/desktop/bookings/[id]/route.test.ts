import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeSelectQuery } from "@/test-utils/db-mock";

const requireDesktopBookingsMock = vi.hoisted(() => vi.fn());
const requireDesktopWriteMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const dbSelectMock = vi.hoisted(() => vi.fn());
const updateDeviceBookingMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopBookings: requireDesktopBookingsMock,
  requireDesktopWrite: requireDesktopWriteMock,
}));
vi.mock("@/lib/rate-limit", () => ({ withRateLimit: withRateLimitMock }));
vi.mock("@/db", () => ({ db: { select: dbSelectMock } }));
vi.mock("@/lib/dashboard/device-bookings", () => ({
  updateDeviceBooking: updateDeviceBookingMock,
}));

import { GET, PATCH } from "./route";

const desktopAuthOk = { ok: true, context: { businessId: "00000000-0000-4000-8000-000000000001", deviceId: "device_1", keyId: "key_1", keyType: "desktop" } };
const desktopAuthFail = { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };

describe("GET /api/v1/desktop/bookings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireDesktopBookingsMock.mockResolvedValue(desktopAuthOk);
    withRateLimitMock.mockResolvedValue({ ok: true });
    dbSelectMock.mockReturnValue(makeSelectQuery([
      {
        id: "00000000-0000-4000-8000-000000000003",
        clientId: "client_1",
        clientName: "Ama",
        clientPhone: "+94770000000",
        clientEmail: "ama@example.com",
        startsAt: new Date("2026-06-01T09:00:00.000Z"),
        endsAt: new Date("2026-06-01T09:45:00.000Z"),
        status: "confirmed",
        notes: "Bring reference photo",
        staffNotes: "VIP client",
        createdAt: new Date("2026-05-20T08:00:00.000Z"),
        serviceName: "Haircut",
        staffName: "Kasun",
        clientStage: "active",
      },
    ]));
  });

  it("returns 401 when desktop auth fails", async () => {
    requireDesktopBookingsMock.mockResolvedValue(desktopAuthFail);

    const req = new NextRequest("http://localhost/api/v1/desktop/bookings/[id]");
    const res = await GET(req, { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000003" }) });

    expect(res.status).toBe(401);
  });

  it("returns a serialized desktop booking detail payload", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/bookings/[id]");
    const res = await GET(req, { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000003" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      id: "00000000-0000-4000-8000-000000000003",
      clientId: "client_1",
      clientName: "Ama",
      clientPhone: "+94770000000",
      clientEmail: "ama@example.com",
      startsAt: "2026-06-01T09:00:00.000Z",
      endsAt: "2026-06-01T09:45:00.000Z",
      status: "confirmed",
      notes: "Bring reference photo",
      staffNotes: "VIP client",
      createdAt: "2026-05-20T08:00:00.000Z",
      serviceName: "Haircut",
      staffName: "Kasun",
      clientStage: "active",
      webUrl: "/dashboard/bookings/00000000-0000-4000-8000-000000000003",
    });
  });
});

describe("PATCH /api/v1/desktop/bookings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireDesktopWriteMock.mockResolvedValue(desktopAuthOk);
    withRateLimitMock.mockResolvedValue({ ok: true });
  });

  it("returns 401 when desktop write auth fails", async () => {
    requireDesktopWriteMock.mockResolvedValue(desktopAuthFail);

    const req = new NextRequest("http://localhost/api/v1/desktop/bookings/[id]", {
      method: "PATCH",
      body: JSON.stringify({ notes: "Updated" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000003" }) });

    expect(res.status).toBe(401);
    expect(updateDeviceBookingMock).not.toHaveBeenCalled();
  });

  it("updates the booking via the device helper", async () => {
    updateDeviceBookingMock.mockResolvedValue({
      status: "updated",
      booking: {
        id: "00000000-0000-4000-8000-000000000003",
        clientName: "Ama",
        status: "confirmed",
        notes: "Updated",
      },
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/bookings/[id]", {
      method: "PATCH",
      body: JSON.stringify({ notes: "Updated" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000003" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.notes).toBe("Updated");
    expect(updateDeviceBookingMock).toHaveBeenCalled();
  });
});
