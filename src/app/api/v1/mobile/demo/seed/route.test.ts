import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requireMobileWriteMock = vi.hoisted(() => vi.fn());
const seedFounderDemoCatalogMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/mobile/_shared", () => ({
  requireMobileWrite: requireMobileWriteMock,
}));

vi.mock("@/lib/founder-demo-seed", () => ({
  seedFounderDemoCatalog: seedFounderDemoCatalogMock,
}));

import { POST } from "./route";

function req() {
  return new NextRequest("http://localhost/api/v1/mobile/demo/seed", { method: "POST" });
}

describe("POST /api/v1/mobile/demo/seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated devices", async () => {
    requireMobileWriteMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(seedFounderDemoCatalogMock).not.toHaveBeenCalled();
  });

  it("rejects non-founder businesses", async () => {
    requireMobileWriteMock.mockResolvedValue({
      ok: true,
      context: { businessId: "biz_other" },
    });
    seedFounderDemoCatalogMock.mockResolvedValue({
      ok: false,
      error: "Demo data is only available on the founder testing account.",
      status: 403,
    });

    const res = await POST(req());
    expect(res.status).toBe(403);
  });

  it("seeds demo catalog for the founder business", async () => {
    requireMobileWriteMock.mockResolvedValue({
      ok: true,
      context: { businessId: "biz_founder" },
    });
    seedFounderDemoCatalogMock.mockResolvedValue({
      ok: true,
      created: {
        locations: 1,
        staff: 2,
        services: 3,
        clients: 4,
        bookings: 6,
        reviews: 1,
        deals: 1,
        broadcasts: 1,
      },
    });

    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.created.bookings).toBe(6);
    expect(seedFounderDemoCatalogMock).toHaveBeenCalledWith("biz_founder");
  });
});
