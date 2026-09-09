import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireDesktopReadMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const getReportsDashboardOverviewMock = vi.hoisted(() => vi.fn());
const requireProMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopRead: requireDesktopReadMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/lib/dashboard/reports", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dashboard/reports")>();
  return {
    ...actual,
    getReportsDashboardOverview: getReportsDashboardOverviewMock,
  };
});

vi.mock("@/lib/plan", async () => {
  class PlanRequiredError extends Error {
    constructor(
      _businessId: string,
      feature: string = "reports",
      requiredPlan: string = "pro"
    ) {
      const label = feature === "reports" ? "Reports" : feature;
      const plan = requiredPlan === "pro" ? "Pro" : requiredPlan;
      super(`${label} requires the ${plan} plan.`);
      this.name = "PlanRequiredError";
    }
  }
  return {
    PlanRequiredError,
    requirePro: requireProMock,
  };
});

import { GET } from "./route";

describe("GET /api/v1/desktop/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopReadMock.mockResolvedValue({
      ok: true,
      context: { businessId: "00000000-0000-4000-8000-000000000001", deviceId: "device_1" },
    });
    requireProMock.mockResolvedValue(undefined);
  });

  it("returns auth response when desktop key is missing", async () => {
    requireDesktopReadMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/reports");
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(requireProMock).not.toHaveBeenCalled();
    expect(getReportsDashboardOverviewMock).not.toHaveBeenCalled();
  });

  it("returns a plan gate response when reports are unavailable", async () => {
    const { PlanRequiredError } = await import("@/lib/plan");
    requireProMock.mockRejectedValue(new PlanRequiredError("00000000-0000-4000-8000-000000000001", "reports", "pro"));

    const req = new NextRequest("http://localhost/api/v1/desktop/reports");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe("Reports requires the Pro plan.");
    expect(getReportsDashboardOverviewMock).not.toHaveBeenCalled();
  });

  it("returns reports data with normalized range and export", async () => {
    getReportsDashboardOverviewMock.mockResolvedValue({
      breakdowns: {
        bookingsBySource: [{ label: "public", value: 4 }],
        bookingsByStatus: [{ label: "completed", value: 3 }],
        revenueByDay: [{ label: "2026-05-28", value: 2500 }],
        revenueByService: [{ label: "Haircut", value: 2500 }],
        staffLoad: [{ label: "Ashan", value: 4 }],
        topClients: [{ label: "Kasun", value: 2500 }],
      },
      business: { id: "00000000-0000-4000-8000-000000000001", name: "Salon", timezone: "Asia/Colombo" },
      export: {
        csv: "Metric,Value\nRevenue,2500",
        filename: "dinaya-reports.csv",
        generatedAt: "2026-05-28T09:00:00.000Z",
      },
      metrics: {
        averageRating: 4.7,
        cancellationRate: 10,
        cancelledBookings: 1,
        completedBookings: 3,
        newClients: 2,
        noShowRate: 0,
        noShows: 0,
        totalBookings: 4,
        totalClients: 8,
        totalRevenueLabel: "LKR 2,500",
        totalRevenueLkr: 2500,
      },
      range: { from: "2026-05-01", to: "2026-05-28" },
      trends: {
        busiestHours: [{ hour: 10, value: 2 }],
        revenueByWeekday: [{ day: "Mon", lastWeek: 1000, thisWeek: 2500 }],
      },
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/reports?from=2026-05-01&to=2026-05-28");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.webUrl).toBe("/dashboard/reports");
    expect(body.metrics.totalRevenueLkr).toBe(2500);
    expect(body.export.filename).toBe("dinaya-reports.csv");
    expect(body.serverTime).toEqual(expect.any(String));
    expect(requireProMock).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001", "reports");
    expect(getReportsDashboardOverviewMock).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001", {
      from: "2026-05-01",
      to: "2026-05-28",
    });
  });

  it("forwards 7d range presets into the normalized window", async () => {
    getReportsDashboardOverviewMock.mockResolvedValue({
      breakdowns: {
        bookingsBySource: [],
        bookingsByStatus: [],
        revenueByDay: [],
        revenueByService: [],
        staffLoad: [],
        topClients: [],
      },
      business: { id: "00000000-0000-4000-8000-000000000001", name: "Salon", timezone: "Asia/Colombo" },
      export: { csv: "", filename: "dinaya-reports.csv", generatedAt: "2026-09-09T00:00:00.000Z" },
      metrics: { totalRevenueLkr: 0 },
      range: { from: "2026-09-03", to: "2026-09-09" },
      trends: { busiestHours: [], revenueByWeekday: [] },
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/reports?range=7d");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(getReportsDashboardOverviewMock).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      expect.objectContaining({
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
    const [, range] = getReportsDashboardOverviewMock.mock.calls[0] as [string, { from: string; to: string }];
    const from = new Date(`${range.from}T12:00:00`);
    const to = new Date(`${range.to}T12:00:00`);
    expect(Math.round((to.getTime() - from.getTime()) / 86_400_000)).toBe(6);
  });

  it("applies desktop reports rate limit", async () => {
    withRateLimitMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Too many requests" }, { status: 429 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/reports");
    const res = await GET(req);

    expect(res.status).toBe(429);
    expect(requireProMock).not.toHaveBeenCalled();
    expect(getReportsDashboardOverviewMock).not.toHaveBeenCalled();
  });
});
