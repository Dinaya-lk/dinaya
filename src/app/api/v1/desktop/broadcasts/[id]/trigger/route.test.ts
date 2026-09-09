import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeSelectQuery, makeUpdateQuery } from "@/test-utils/db-mock";

const requireDesktopWriteMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const requireProMock = vi.hoisted(() => vi.fn());
const sendBroadcastMock = vi.hoisted(() => vi.fn());
const dbSelectMock = vi.hoisted(() => vi.fn());
const dbUpdateMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopWrite: requireDesktopWriteMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/lib/plan", async () => {
  class PlanRequiredError extends Error {}
  return {
    PlanRequiredError,
    requirePro: requireProMock,
  };
});

vi.mock("@/lib/broadcasts", () => ({
  sendBroadcast: sendBroadcastMock,
}));

vi.mock("@/db", () => ({
  db: {
    select: dbSelectMock,
    update: dbUpdateMock,
  },
}));

import { POST } from "./route";

const BUSINESS_ID = "00000000-0000-4000-8000-000000000001";

const broadcastRow = {
  audienceFilter: null,
  audienceType: "all",
  body: "This week's offer",
  businessId: BUSINESS_ID,
  channel: "sms",
  createdAt: new Date("2026-05-28T09:00:00.000Z"),
  failedCount: 0,
  id: "broadcast_1",
  name: "May promo",
  recipientCount: 0,
  sentAt: null,
  sentCount: 0,
  skippedCount: 0,
  status: "draft",
  subject: "Offer",
  updatedAt: new Date("2026-05-28T09:00:00.000Z"),
};

describe("POST /api/v1/desktop/broadcasts/:id/trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopWriteMock.mockResolvedValue({
      ok: true,
      context: { businessId: BUSINESS_ID, deviceId: "device_1" },
    });
    requireProMock.mockResolvedValue(undefined);
    dbSelectMock.mockReturnValue(makeSelectQuery([broadcastRow]));
    dbUpdateMock.mockReturnValue(makeUpdateQuery([{
      channel: "sms",
      id: "broadcast_1",
      recipientCount: 3,
      status: "sent",
    }]));
    sendBroadcastMock.mockResolvedValue({
      failedCount: 0,
      recipientCount: 3,
      sentCount: 3,
      skippedCount: 0,
    });
  });

  it("returns 401 when desktop write scope is missing", async () => {
    requireDesktopWriteMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/broadcasts/broadcast_1/trigger", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "broadcast_1" }) });

    expect(res.status).toBe(401);
    expect(sendBroadcastMock).not.toHaveBeenCalled();
  });

  it("returns 402 when broadcasts are not on the current plan", async () => {
    const { PlanRequiredError } = await import("@/lib/plan");
    requireProMock.mockRejectedValue(new PlanRequiredError("Broadcasts require the Pro plan."));

    const req = new NextRequest("http://localhost/api/v1/desktop/broadcasts/broadcast_1/trigger", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "broadcast_1" }) });
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe("Broadcasts require the Pro plan.");
    expect(sendBroadcastMock).not.toHaveBeenCalled();
  });

  it("sends the broadcast and returns delivery stats", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/broadcasts/broadcast_1/trigger", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "broadcast_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(requireProMock).toHaveBeenCalledWith(BUSINESS_ID, "broadcasts");
    expect(sendBroadcastMock).toHaveBeenCalledWith(expect.objectContaining({
      id: "broadcast_1",
      status: "sending",
    }));
    expect(body).toMatchObject({
      channel: "sms",
      id: "broadcast_1",
      recipientCount: 3,
      status: "sent",
    });
    expect(body.serverTime).toEqual(expect.any(String));
  });
});
