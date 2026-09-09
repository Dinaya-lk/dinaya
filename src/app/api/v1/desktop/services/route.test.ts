import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeInsertQuery, makeSelectQuery } from "@/test-utils/db-mock";

const requireDesktopReadMock = vi.hoisted(() => vi.fn());
const requireDesktopWriteMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const getServicesDashboardListMock = vi.hoisted(() => vi.fn());
const getServiceDashboardDetailMock = vi.hoisted(() => vi.fn());
const requirePlanLimitMock = vi.hoisted(() => vi.fn());
const allocateServiceSlugMock = vi.hoisted(() => vi.fn());
const dbSelectMock = vi.hoisted(() => vi.fn());
const dbInsertMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopRead: requireDesktopReadMock,
  requireDesktopWrite: requireDesktopWriteMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/lib/dashboard/services", () => ({
  getServiceDashboardDetail: getServiceDashboardDetailMock,
  getServicesDashboardList: getServicesDashboardListMock,
  isDashboardServiceStatusFilter: (value: string) => ["all", "active", "inactive"].includes(value),
}));

vi.mock("@/lib/plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plan")>();
  return {
    ...actual,
    requirePlanLimit: requirePlanLimitMock,
  };
});

vi.mock("@/lib/service-slug", () => ({
  allocateServiceSlug: allocateServiceSlugMock,
}));

vi.mock("@/db", () => ({
  db: {
    insert: dbInsertMock,
    select: dbSelectMock,
  },
}));

import { GET, POST } from "./route";

const businessId = "00000000-0000-4000-8000-000000000001";
const createdServiceId = "22222222-2222-4222-8222-222222222222";

const serviceDetail = {
  assignedStaff: [],
  recentBookings: [],
  service: {
    afterBuffer: 0,
    beforeBuffer: 0,
    createdAt: "2026-05-28T09:00:00.000Z",
    dailyCapacity: null,
    depositPercent: 0,
    description: "Premium cut and finish",
    durationMinutes: 45,
    id: createdServiceId,
    isActive: true,
    minimumNoticeHours: 0,
    name: "Signature cut",
    priceLkr: 3500,
    requiresPayment: false,
  },
};

function authOk() {
  return { ok: true, context: { businessId, deviceId: "device_1" } };
}

describe("GET /api/v1/desktop/services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopReadMock.mockResolvedValue(authOk());
    requireDesktopWriteMock.mockResolvedValue(authOk());
    getServicesDashboardListMock.mockResolvedValue({
      filters: { limit: 80, q: "", status: "all" },
      rows: [
        {
          afterBuffer: 5,
          assignedStaffCount: 2,
          beforeBuffer: 10,
          bookingCount: 12,
          createdAt: "2026-05-28T09:00:00.000Z",
          dailyCapacity: null,
          depositPercent: 25,
          description: "Premium cut and finish",
          durationMinutes: 45,
          futureBookingCount: 3,
          id: "service_1",
          isActive: true,
          lastBookingAt: "2026-05-28T10:00:00.000Z",
          minimumNoticeHours: 2,
          name: "Signature cut",
          priceLkr: 3500,
          requiresPayment: true,
        },
      ],
      summary: {
        activeServices: 1,
        averageDurationMinutes: 45,
        averagePriceLkr: 3500,
        inactiveServices: 0,
        paymentRequiredServices: 1,
        totalServices: 1,
      },
    });
  });

  it("returns auth response when desktop key is missing", async () => {
    requireDesktopReadMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/services");
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(getServicesDashboardListMock).not.toHaveBeenCalled();
  });

  it("returns filtered services with summary metrics", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/services?status=active&q=cut&limit=20");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getServicesDashboardListMock).toHaveBeenCalledWith(businessId, {
      limit: 20,
      q: "cut",
      status: "active",
    });
    expect(body.webUrl).toBe("/dashboard/services");
    expect(body.rows).toHaveLength(1);
    expect(body.summary.activeServices).toBe(1);
    expect(body.serverTime).toEqual(expect.any(String));
  });

  it("rejects invalid status filters", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/services?status=archived");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("status is invalid.");
    expect(getServicesDashboardListMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/desktop/services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopReadMock.mockResolvedValue(authOk());
    requireDesktopWriteMock.mockResolvedValue(authOk());
    requirePlanLimitMock.mockResolvedValue(undefined);
    allocateServiceSlugMock.mockResolvedValue("signature-cut");
    dbSelectMock.mockReturnValue(makeSelectQuery([{ value: 0 }]));
    dbInsertMock.mockReturnValue(makeInsertQuery([{ id: createdServiceId }]));
    getServiceDashboardDetailMock.mockResolvedValue(serviceDetail);
  });

  it("returns auth response when desktop write key is missing", async () => {
    requireDesktopWriteMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/services", {
      body: JSON.stringify({ durationMinutes: 45, name: "Signature cut" }),
      method: "POST",
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("rejects invalid create payloads", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/services", {
      body: JSON.stringify({ name: "Signature cut" }),
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("durationMinutes is required and must be at least 5 minutes.");
    expect(dbInsertMock).not.toHaveBeenCalled();
    expect(allocateServiceSlugMock).not.toHaveBeenCalled();
  });

  it("creates a service and returns dashboard detail", async () => {
    const insertQuery = makeInsertQuery([{ id: createdServiceId }]);
    dbInsertMock.mockReturnValue(insertQuery);

    const req = new NextRequest("http://localhost/api/v1/desktop/services", {
      body: JSON.stringify({
        description: "Premium cut and finish",
        durationMinutes: 45,
        name: "Signature cut",
        priceLkr: 3500,
      }),
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(requirePlanLimitMock).toHaveBeenCalledWith(businessId, "services", 0);
    expect(allocateServiceSlugMock).toHaveBeenCalledWith(businessId, "Signature cut");
    expect(insertQuery.values).toHaveBeenCalledWith(expect.objectContaining({
      businessId,
      durationMinutes: 45,
      name: "Signature cut",
      priceLkr: 3500,
      slug: "signature-cut",
    }));
    expect(getServiceDashboardDetailMock).toHaveBeenCalledWith(businessId, createdServiceId);
    expect(body.service).toMatchObject({ id: createdServiceId, name: "Signature cut", durationMinutes: 45 });
    expect(body.webUrl).toBe(`/dashboard/services/${createdServiceId}`);
    expect(body.serverTime).toEqual(expect.any(String));
  });
});
