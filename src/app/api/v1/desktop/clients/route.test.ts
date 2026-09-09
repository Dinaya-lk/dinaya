import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeInsertQuery, makeSelectQuery } from "@/test-utils/db-mock";

const requireDesktopReadMock = vi.hoisted(() => vi.fn());
const requireDesktopWriteMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const getClientsDashboardListMock = vi.hoisted(() => vi.fn());
const getClientDashboardDetailMock = vi.hoisted(() => vi.fn());
const dbSelectMock = vi.hoisted(() => vi.fn());
const dbInsertMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopRead: requireDesktopReadMock,
  requireDesktopWrite: requireDesktopWriteMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/lib/dashboard/clients", () => ({
  getClientDashboardDetail: getClientDashboardDetailMock,
  getClientsDashboardList: getClientsDashboardListMock,
  isDashboardClientStageFilter: (value: string) => ["all", "lead", "prospect", "active", "churned"].includes(value),
}));

vi.mock("@/db", () => ({
  db: {
    insert: dbInsertMock,
    select: dbSelectMock,
  },
}));

import { GET, POST } from "./route";

const businessId = "00000000-0000-4000-8000-000000000001";
const createdClientId = "11111111-1111-4111-8111-111111111111";

const clientDetail = {
  bookings: [],
  client: {
    communicationOptOut: false,
    createdAt: "2026-05-28T09:00:00.000Z",
    email: "nilu@example.com",
    id: createdClientId,
    internalNotes: null,
    lastAiContactAt: null,
    loyaltyTier: null,
    name: "Nilu Perera",
    phone: "+94770000000",
    source: "booking_page",
    stage: "lead",
    tags: ["vip"],
  },
  notes: [],
};

function authOk() {
  return { ok: true, context: { businessId, deviceId: "device_1" } };
}

describe("GET /api/v1/desktop/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopReadMock.mockResolvedValue(authOk());
    requireDesktopWriteMock.mockResolvedValue(authOk());
    getClientsDashboardListMock.mockResolvedValue({
      filters: { limit: 80, q: "", stage: "all" },
      rows: [
        {
          bookingCount: 3,
          communicationOptOut: false,
          completedBookings: 2,
          createdAt: "2026-05-28T09:00:00.000Z",
          email: "nilu@example.com",
          id: "client_1",
          lastAiContactAt: null,
          lastBookingAt: "2026-05-28T09:30:00.000Z",
          loyaltyTier: "gold",
          name: "Nilu Perera",
          phone: "0770000000",
          source: "booking_page",
          stage: "active",
          tags: ["vip"],
        },
      ],
      summary: {
        activeClients: 1,
        churnedClients: 0,
        leads: 0,
        optedOutClients: 0,
        prospects: 0,
        totalClients: 1,
        withEmail: 1,
      },
    });
  });

  it("returns auth response when desktop key is missing", async () => {
    requireDesktopReadMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/clients");
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(getClientsDashboardListMock).not.toHaveBeenCalled();
  });

  it("returns filtered clients with summary metrics", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/clients?stage=active&q=nilu&limit=20");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getClientsDashboardListMock).toHaveBeenCalledWith(businessId, {
      limit: 20,
      q: "nilu",
      stage: "active",
    });
    expect(body.webUrl).toBe("/dashboard/clients");
    expect(body.rows).toHaveLength(1);
    expect(body.summary.activeClients).toBe(1);
    expect(body.serverTime).toEqual(expect.any(String));
  });

  it("rejects invalid stage filters", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/clients?stage=lost");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("stage is invalid.");
    expect(getClientsDashboardListMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/desktop/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopReadMock.mockResolvedValue(authOk());
    requireDesktopWriteMock.mockResolvedValue(authOk());
    dbSelectMock.mockReturnValue(makeSelectQuery([]));
    dbInsertMock.mockReturnValue(makeInsertQuery([{ id: createdClientId }]));
    getClientDashboardDetailMock.mockResolvedValue(clientDetail);
  });

  it("returns auth response when desktop write key is missing", async () => {
    requireDesktopWriteMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/clients", {
      body: JSON.stringify({ name: "Nilu Perera", phone: "0770000000" }),
      method: "POST",
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("rejects invalid create payloads", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/clients", {
      body: JSON.stringify({ name: "Nilu Perera" }),
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Please check the client details.");
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("creates a client and returns dashboard detail", async () => {
    const insertQuery = makeInsertQuery([{ id: createdClientId }]);
    dbInsertMock.mockReturnValue(insertQuery);

    const req = new NextRequest("http://localhost/api/v1/desktop/clients", {
      body: JSON.stringify({
        email: "nilu@example.com",
        name: "Nilu Perera",
        phone: "0770000000",
        tags: ["vip"],
      }),
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(insertQuery.values).toHaveBeenCalledWith(expect.objectContaining({
      businessId,
      email: "nilu@example.com",
      name: "Nilu Perera",
      phone: "+94770000000",
    }));
    expect(getClientDashboardDetailMock).toHaveBeenCalledWith(businessId, createdClientId);
    expect(body.client).toMatchObject({ id: createdClientId, name: "Nilu Perera", phone: "+94770000000" });
    expect(body.webUrl).toBe(`/dashboard/clients/${createdClientId}`);
    expect(body.serverTime).toEqual(expect.any(String));
  });
});
