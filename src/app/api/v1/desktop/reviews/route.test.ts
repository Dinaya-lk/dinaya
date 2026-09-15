import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireDesktopReadMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const getReviewsDashboardListMock = vi.hoisted(() => vi.fn());
const requireProMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopRead: requireDesktopReadMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/lib/dashboard/reviews", () => ({
  getReviewsDashboardList: getReviewsDashboardListMock,
  isDashboardReviewStatusFilter: (value: string) => ["all", "published", "hidden", "needs_reply", "replied"].includes(value),
}));

vi.mock("@/lib/plan", () => {
  class PlanRequiredError extends Error {
    constructor() {
      super("Reviews requires the Pro plan.");
      this.name = "PlanRequiredError";
    }
  }

  return {
    PlanRequiredError,
    requirePro: requireProMock,
  };
});

import { GET } from "./route";

describe("GET /api/v1/desktop/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireProMock.mockResolvedValue(undefined);
    requireDesktopReadMock.mockResolvedValue({
      ok: true,
      context: { businessId: "00000000-0000-4000-8000-000000000001", deviceId: "device_1" },
    });
    getReviewsDashboardListMock.mockResolvedValue({
      filters: { limit: 80, q: "", rating: null, status: "all" },
      rows: [
        {
          booking: {
            id: "booking_1",
            locationName: "Kandy",
            serviceName: "Haircut",
            staffName: "Ashan",
            startsAt: "2026-05-28T09:00:00.000Z",
            status: "completed",
          },
          clientName: "Kasun",
          comment: "Great service",
          createdAt: "2026-05-28T10:00:00.000Z",
          id: "review_1",
          isPublished: true,
          ownerRepliedAt: null,
          ownerReply: null,
          ownerReplySource: null,
          rating: 5,
        },
      ],
      summary: {
        averageRating: 4.7,
        fiveStarReviews: 7,
        hiddenReviews: 1,
        needsReplyReviews: 2,
        publishedReviews: 9,
        repliedReviews: 8,
        totalReviews: 10,
      },
    });
  });

  it("returns auth response when desktop key is missing", async () => {
    requireDesktopReadMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/reviews");
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(getReviewsDashboardListMock).not.toHaveBeenCalled();
  });

  it("returns filtered reviews with summary metrics", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/reviews?status=needs_reply&rating=5&q=kasun&limit=20");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getReviewsDashboardListMock).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001", {
      limit: 20,
      q: "kasun",
      rating: 5,
      status: "needs_reply",
    });
    expect(body.webUrl).toBe("/dashboard/reviews");
    expect(body.rows).toHaveLength(1);
    expect(body.summary.averageRating).toBe(4.7);
    expect(body.serverTime).toEqual(expect.any(String));
  });

  it("returns 402 when the reviews feature is not available", async () => {
    const { PlanRequiredError } = await import("@/lib/plan");
    requireProMock.mockRejectedValue(new PlanRequiredError());

    const req = new NextRequest("http://localhost/api/v1/desktop/reviews");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.feature).toBe("reviews");
    expect(getReviewsDashboardListMock).not.toHaveBeenCalled();
  });

  it("rejects invalid status filters", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/reviews?status=archived");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("status is invalid.");
    expect(getReviewsDashboardListMock).not.toHaveBeenCalled();
  });

  it("rejects invalid rating filters", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/reviews?rating=6");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("rating is invalid.");
    expect(getReviewsDashboardListMock).not.toHaveBeenCalled();
  });
});
