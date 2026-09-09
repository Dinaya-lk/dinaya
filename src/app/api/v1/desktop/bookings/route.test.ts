import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireDesktopBookingsMock = vi.hoisted(() => vi.fn());
const requireDesktopWriteMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const dbSelectMock = vi.hoisted(() => vi.fn());
const createDeviceWalkInBookingMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopBookings: requireDesktopBookingsMock,
  requireDesktopWrite: requireDesktopWriteMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/db", () => ({
  db: {
    select: dbSelectMock,
  },
}));

vi.mock("@/lib/dashboard/device-bookings", () => ({
  createDeviceWalkInBooking: createDeviceWalkInBookingMock,
}));

import { GET, POST } from "./route";

function makeLimitQuery(result: unknown) {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn(async () => result),
  };
  return query;
}

function makeBookingsQuery(result: unknown) {
  const query = {
    from: vi.fn(() => query),
    innerJoin: vi.fn(() => query),
    leftJoin: vi.fn(() => query),
    where: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    limit: vi.fn(async () => result),
  };
  return query;
}

describe("GET /api/v1/desktop/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
  });

  it("returns auth response when desktop key is missing", async () => {
    requireDesktopBookingsMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/bookings");
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed since param", async () => {
    requireDesktopBookingsMock.mockResolvedValue({
      ok: true,
      context: { businessId: "00000000-0000-4000-8000-000000000001", deviceId: "device_1" },
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/bookings?since=bad");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("since");
  });

  it("returns compact rows and cursor", async () => {
    requireDesktopBookingsMock.mockResolvedValue({
      ok: true,
      context: { businessId: "00000000-0000-4000-8000-000000000001", deviceId: "device_1" },
    });

    dbSelectMock
      .mockReturnValueOnce(makeLimitQuery([{ timezone: "Asia/Colombo" }]))
      .mockReturnValueOnce(makeBookingsQuery([
        {
          id: "bk_1",
          clientId: null,
          clientName: "Kasun",
          clientPhone: "+94770000000",
          clientEmail: "kasun@example.com",
          startsAt: new Date("2026-05-26T09:00:00.000Z"),
          endsAt: new Date("2026-05-26T09:45:00.000Z"),
          status: "confirmed",
          source: "online",
          createdAt: new Date("2026-05-26T08:00:00.000Z"),
          amountLkr: 2500,
          paymentStatus: "success",
          serviceName: "Haircut",
          staffId: "st_1",
          staffName: "Ashan",
        },
      ]));

    const req = new NextRequest("http://localhost/api/v1/desktop/bookings?tab=today&limit=20");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toMatchObject({
      id: "bk_1",
      clientName: "Kasun",
      serviceName: "Haircut",
      staffName: "Ashan",
      status: "confirmed",
    });
    expect(body.nextCursor).toBeNull();
  });
});

describe("POST /api/v1/desktop/bookings", () => {
  const writeAuthOk = {
    ok: true,
    context: {
      businessId: "00000000-0000-4000-8000-000000000001",
      deviceId: "device_1",
      keyId: "key_1",
      keyType: "desktop",
    },
  };

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

    const req = new NextRequest("http://localhost/api/v1/desktop/bookings", {
      method: "POST",
      body: JSON.stringify({
        clientName: "Kasun",
        clientPhone: "0771234567",
        serviceId: "00000000-0000-4000-8000-000000000010",
        startsAt: "2026-09-04T10:00:00.000Z",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(createDeviceWalkInBookingMock).not.toHaveBeenCalled();
  });

  it("creates a walk-in booking via the device helper", async () => {
    createDeviceWalkInBookingMock.mockResolvedValue({
      status: "created",
      booking: {
        id: "bk_1",
        clientId: "client_1",
        clientName: "Kasun",
        clientPhone: "+94771234567",
        clientEmail: null,
        serviceName: "Haircut",
        staffId: "st_1",
        staffName: "Ashan",
        startsAt: "2026-09-04T10:00:00.000Z",
        endsAt: "2026-09-04T10:45:00.000Z",
        status: "confirmed",
        webUrl: "/dashboard/bookings/bk_1",
      },
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/bookings", {
      method: "POST",
      body: JSON.stringify({
        clientName: "Kasun",
        clientPhone: "0771234567",
        serviceId: "00000000-0000-4000-8000-000000000010",
        staffId: "00000000-0000-4000-8000-000000000011",
        startsAt: "2026-09-04T10:00:00.000Z",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("confirmed");
    expect(body.clientName).toBe("Kasun");
    expect(createDeviceWalkInBookingMock).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      expect.objectContaining({
        clientName: "Kasun",
        clientPhone: "0771234567",
      }),
      expect.objectContaining({ channel: "desktop" }),
    );
  });
});
