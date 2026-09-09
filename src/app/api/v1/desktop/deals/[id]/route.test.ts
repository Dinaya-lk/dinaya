import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeSelectQuery, makeUpdateQuery } from "@/test-utils/db-mock";

const requireDesktopReadMock = vi.hoisted(() => vi.fn());
const requireDesktopWriteMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const getDealDashboardDetailMock = vi.hoisted(() => vi.fn());
const requireProMock = vi.hoisted(() => vi.fn());
const dbSelectMock = vi.hoisted(() => vi.fn());
const dbUpdateMock = vi.hoisted(() => vi.fn());
const logActivityMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopRead: requireDesktopReadMock,
  requireDesktopWrite: requireDesktopWriteMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/lib/dashboard/deals", () => ({
  getDealDashboardDetail: getDealDashboardDetailMock,
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: logActivityMock,
}));

vi.mock("@/db", () => ({
  db: {
    select: dbSelectMock,
    update: dbUpdateMock,
  },
}));

vi.mock("@/lib/plan", async () => {
  class PlanRequiredError extends Error {}
  return {
    PlanRequiredError,
    requirePro: requireProMock,
  };
});

import { GET, PATCH } from "./route";

const BUSINESS_ID = "00000000-0000-4000-8000-000000000001";

const dealDetail = {
  deal: {
    apptWindowEnd: "2026-06-01T17:00:00.000Z",
    apptWindowStart: "2026-06-01T09:00:00.000Z",
    conversionPercent: 25,
    createdAt: "2026-05-28T09:00:00.000Z",
    dealWindowEnd: "2026-05-30T09:00:00.000Z",
    dealWindowStart: "2026-05-28T09:00:00.000Z",
    discountPercent: 20,
    discountedPriceLkr: 2000,
    displayStatus: "active",
    id: "deal_1",
    impressionCount: 8,
    slotsRedeemed: 2,
    slotsRemaining: 3,
    slotsTotal: 5,
    status: "active",
  },
  location: { id: "location_1", name: "Kandy", timezone: "Asia/Colombo" },
  recentBookings: [
    {
      amountLkr: 2000,
      clientName: "Kasun",
      discountedPriceLkr: 2000,
      id: "booking_1",
      paymentStatus: "success",
      startsAt: "2026-06-01T09:00:00.000Z",
      status: "confirmed",
    },
  ],
  service: {
    depositPercent: 0,
    durationMinutes: 45,
    id: "service_1",
    name: "Haircut",
    priceLkr: 2500,
    requiresPayment: true,
  },
  staff: { id: "staff_1", name: "Ashan" },
};

describe("GET /api/v1/desktop/deals/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopReadMock.mockResolvedValue({
      ok: true,
      context: { businessId: BUSINESS_ID, deviceId: "device_1" },
    });
    requireDesktopWriteMock.mockResolvedValue({
      ok: true,
      context: { businessId: BUSINESS_ID, deviceId: "device_1" },
    });
    requireProMock.mockResolvedValue(undefined);
    logActivityMock.mockResolvedValue(undefined);
    dbSelectMock.mockReturnValue(makeSelectQuery([]));
    dbUpdateMock.mockReturnValue(makeUpdateQuery([]));
  });

  it("returns auth response when desktop key is missing", async () => {
    requireDesktopReadMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/deals/deal_1");
    const res = await GET(req, { params: Promise.resolve({ id: "deal_1" }) });

    expect(res.status).toBe(401);
    expect(getDealDashboardDetailMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a deal outside the tenant", async () => {
    getDealDashboardDetailMock.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/desktop/deals/deal_1");
    const res = await GET(req, { params: Promise.resolve({ id: "deal_1" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Not found.");
    expect(requireProMock).toHaveBeenCalledWith(BUSINESS_ID, "deals");
    expect(getDealDashboardDetailMock).toHaveBeenCalledWith(BUSINESS_ID, "deal_1");
  });

  it("returns deal status, windows, pricing, and booking context", async () => {
    getDealDashboardDetailMock.mockResolvedValue(dealDetail);

    const req = new NextRequest("http://localhost/api/v1/desktop/deals/deal_1");
    const res = await GET(req, { params: Promise.resolve({ id: "deal_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.webUrl).toBe("/dashboard/deals");
    expect(body.deal).toMatchObject({ id: "deal_1", displayStatus: "active", slotsRemaining: 3 });
    expect(body.service).toMatchObject({ name: "Haircut", priceLkr: 2500 });
    expect(body.recentBookings).toHaveLength(1);
    expect(body.serverTime).toEqual(expect.any(String));
  });
});

describe("PATCH /api/v1/desktop/deals/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopWriteMock.mockResolvedValue({
      ok: true,
      context: { businessId: BUSINESS_ID, deviceId: "device_1" },
    });
    requireProMock.mockResolvedValue(undefined);
    logActivityMock.mockResolvedValue(undefined);
    dbSelectMock.mockReturnValue(makeSelectQuery([{ id: "deal_1", status: "active" }]));
    dbUpdateMock.mockReturnValue(makeUpdateQuery([{ id: "deal_1", status: "cancelled" }]));
    getDealDashboardDetailMock.mockResolvedValue({
      ...dealDetail,
      deal: { ...dealDetail.deal, status: "cancelled", displayStatus: "cancelled" },
    });
  });

  it("returns 401 when desktop write scope is missing", async () => {
    requireDesktopWriteMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/deals/deal_1", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "deal_1" }) });

    expect(res.status).toBe(401);
    expect(requireProMock).not.toHaveBeenCalled();
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("returns 402 when deals are not on the current plan", async () => {
    const { PlanRequiredError } = await import("@/lib/plan");
    requireProMock.mockRejectedValue(new PlanRequiredError("Deals require the Pro plan."));

    const req = new NextRequest("http://localhost/api/v1/desktop/deals/deal_1", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "deal_1" }) });
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe("Deals require the Pro plan.");
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("cancels an active deal when isActive is false", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/deals/deal_1", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "deal_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(requireProMock).toHaveBeenCalledWith(BUSINESS_ID, "deals");
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(body.deal).toMatchObject({ id: "deal_1", status: "cancelled" });
    expect(body.webUrl).toBe("/dashboard/deals");
    expect(logActivityMock).toHaveBeenCalledWith({
      action: "cancelled",
      businessId: BUSINESS_ID,
      entity: "deal",
      entityId: "deal_1",
    });
  });

  it("reactivates a cancelled deal when isActive is true", async () => {
    dbSelectMock.mockReturnValue(makeSelectQuery([{ id: "deal_1", status: "cancelled" }]));
    dbUpdateMock.mockReturnValue(makeUpdateQuery([{ id: "deal_1", status: "active" }]));
    getDealDashboardDetailMock.mockResolvedValue(dealDetail);

    const req = new NextRequest("http://localhost/api/v1/desktop/deals/deal_1", {
      method: "PATCH",
      body: JSON.stringify({ isActive: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "deal_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deal).toMatchObject({ id: "deal_1", status: "active" });
    expect(logActivityMock).toHaveBeenCalledWith({
      action: "updated",
      businessId: BUSINESS_ID,
      entity: "deal",
      entityId: "deal_1",
    });
  });

  it("rejects reactivating expired or sold-out deals", async () => {
    dbSelectMock.mockReturnValue(makeSelectQuery([{ id: "deal_1", status: "expired" }]));

    const expiredReq = new NextRequest("http://localhost/api/v1/desktop/deals/deal_1", {
      method: "PATCH",
      body: JSON.stringify({ status: "active" }),
    });
    const expiredRes = await PATCH(expiredReq, { params: Promise.resolve({ id: "deal_1" }) });
    const expiredBody = await expiredRes.json();

    expect(expiredRes.status).toBe(400);
    expect(expiredBody.error).toBe("Expired deals cannot be reactivated.");

    dbSelectMock.mockReturnValue(makeSelectQuery([{ id: "deal_1", status: "sold_out" }]));
    const soldOutReq = new NextRequest("http://localhost/api/v1/desktop/deals/deal_1", {
      method: "PATCH",
      body: JSON.stringify({ isActive: true }),
    });
    const soldOutRes = await PATCH(soldOutReq, { params: Promise.resolve({ id: "deal_1" }) });
    const soldOutBody = await soldOutRes.json();

    expect(soldOutRes.status).toBe(400);
    expect(soldOutBody.error).toBe("Sold-out deals cannot be reactivated.");
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });
});
