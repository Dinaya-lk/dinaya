import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireDesktopReadMock = vi.hoisted(() => vi.fn());
const requireDesktopWriteMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const getBroadcastsDashboardListMock = vi.hoisted(() => vi.fn());
const requireProMock = vi.hoisted(() => vi.fn());
const createDeviceBroadcastMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopRead: requireDesktopReadMock,
  requireDesktopWrite: requireDesktopWriteMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/lib/dashboard/broadcasts", () => ({
  getBroadcastsDashboardList: getBroadcastsDashboardListMock,
  isDashboardBroadcastChannelFilter: (value: string) => ["all", "email", "whatsapp", "sms"].includes(value),
  isDashboardBroadcastStatusFilter: (value: string) => ["all", "draft", "sending", "sent", "failed"].includes(value),
}));

vi.mock("@/lib/dashboard/device-broadcasts", () => ({
  createDeviceBroadcast: createDeviceBroadcastMock,
}));

vi.mock("@/lib/plan", async () => {
  class PlanRequiredError extends Error {}
  return {
    PlanRequiredError,
    requirePro: requireProMock,
  };
});

import { GET, POST } from "./route";

describe("GET /api/v1/desktop/broadcasts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopReadMock.mockResolvedValue({
      ok: true,
      context: { businessId: "00000000-0000-4000-8000-000000000001", deviceId: "device_1" },
    });
    requireProMock.mockResolvedValue(undefined);
    getBroadcastsDashboardListMock.mockResolvedValue({
      filters: { channel: "all", limit: 80, q: "", status: "all" },
      rows: [
        {
          audienceFilter: null,
          audienceLabel: "All clients",
          audienceType: "all",
          body: "Book this week for a discount.",
          channel: "email",
          createdAt: "2026-05-28T09:00:00.000Z",
          deliveryRatePercent: 80,
          failedCount: 1,
          failureRatePercent: 10,
          id: "broadcast_1",
          name: "May offer",
          recipientCount: 10,
          remainingCount: 0,
          sentAt: "2026-05-28T09:05:00.000Z",
          sentCount: 8,
          skippedCount: 1,
          status: "sent",
          subject: "May offer",
          updatedAt: "2026-05-28T09:05:00.000Z",
        },
      ],
      summary: {
        draftBroadcasts: 0,
        emailBroadcasts: 1,
        failedBroadcasts: 0,
        failedMessages: 1,
        sentBroadcasts: 1,
        sentMessages: 8,
        sendingBroadcasts: 0,
        skippedMessages: 1,
        smsBroadcasts: 0,
        totalBroadcasts: 1,
        totalRecipients: 10,
        whatsappBroadcasts: 0,
      },
    });
  });

  it("returns auth response when desktop key is missing", async () => {
    requireDesktopReadMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/broadcasts");
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(getBroadcastsDashboardListMock).not.toHaveBeenCalled();
  });

  it("returns filtered broadcasts with summary metrics", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/broadcasts?status=sent&channel=email&q=offer&limit=20");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(requireProMock).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001", "broadcasts");
    expect(getBroadcastsDashboardListMock).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001", {
      channel: "email",
      limit: 20,
      q: "offer",
      status: "sent",
    });
    expect(body.webUrl).toBe("/dashboard/broadcasts");
    expect(body.rows).toHaveLength(1);
    expect(body.summary.sentMessages).toBe(8);
    expect(body.serverTime).toEqual(expect.any(String));
  });

  it("rejects invalid status filters", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/broadcasts?status=archived");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("status is invalid.");
    expect(getBroadcastsDashboardListMock).not.toHaveBeenCalled();
  });

  it("rejects invalid channel filters", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/broadcasts?channel=push");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("channel is invalid.");
    expect(getBroadcastsDashboardListMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/desktop/broadcasts", () => {
  const businessId = "00000000-0000-4000-8000-000000000001";
  const draftPayload = {
    name: "May offer",
    channel: "email",
    subject: "May offer",
    body: "Book this week for a discount.",
    audienceType: "all",
  };
  const draftBroadcast = {
    audienceFilter: null,
    audienceType: "all",
    body: "Book this week for a discount.",
    channel: "email",
    createdAt: "2026-05-28T09:00:00.000Z",
    failedCount: 0,
    id: "broadcast_1",
    name: "May offer",
    recipientCount: 10,
    sentAt: null,
    sentCount: 0,
    skippedCount: 0,
    status: "draft",
    subject: "May offer",
    updatedAt: "2026-05-28T09:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopWriteMock.mockResolvedValue({
      ok: true,
      context: { businessId, deviceId: "device_1" },
    });
    requireProMock.mockResolvedValue(undefined);
    createDeviceBroadcastMock.mockResolvedValue({
      status: "created",
      broadcast: draftBroadcast,
    });
  });

  it("creates a draft broadcast without sending", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/broadcasts", {
      body: JSON.stringify(draftPayload),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(withRateLimitMock).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        limit: 60,
        scope: "desktop-broadcast-create",
        windowSeconds: 60,
      }),
      expect.objectContaining({ keySuffix: `${businessId}:device_1` }),
    );
    expect(requireProMock).toHaveBeenCalledWith(businessId, "broadcasts");
    expect(createDeviceBroadcastMock).toHaveBeenCalledWith(businessId, draftPayload);
    expect(createDeviceBroadcastMock.mock.calls[0]?.[1]?.sendNow).not.toBe(true);
    expect(body.broadcast).toMatchObject({ id: "broadcast_1", status: "draft" });
    expect(body.webUrl).toBe("/dashboard/broadcasts");
    expect(body.serverTime).toEqual(expect.any(String));
  });

  it("returns 400 when create is invalid", async () => {
    createDeviceBroadcastMock.mockResolvedValue({
      status: "invalid",
      error: "No eligible clients match this audience. Clients who opted out are excluded.",
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/broadcasts", {
      body: JSON.stringify(draftPayload),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe(
      "No eligible clients match this audience. Clients who opted out are excluded.",
    );
    expect(body.broadcast).toBeUndefined();
  });

  it("returns 402 when broadcasts are not on the current plan", async () => {
    const { PlanRequiredError } = await import("@/lib/plan");
    requireProMock.mockRejectedValue(new PlanRequiredError("Broadcasts require the Pro plan."));

    const req = new NextRequest("http://localhost/api/v1/desktop/broadcasts", {
      body: JSON.stringify(draftPayload),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe("Broadcasts require the Pro plan.");
    expect(createDeviceBroadcastMock).not.toHaveBeenCalled();
  });
});
