import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireAnyApiKeyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-key-auth", () => ({
  requireAnyApiKey: requireAnyApiKeyMock,
}));

import {
  requireMobileBookings,
  requireMobileRead,
  requireMobileWrite,
} from "./_shared";

const okMobile = {
  ok: true as const,
  context: {
    businessId: "00000000-0000-4000-8000-000000000001",
    deviceId: "device_1",
    deviceName: "Pixel 8",
    keyId: "key_1",
    keyType: "mobile",
    scopes: ["mobile:read", "mobile:bookings", "mobile:write"],
  },
};

function req(path = "http://localhost/api/v1/mobile/bootstrap") {
  return new NextRequest(path);
}

describe("mobile auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAnyApiKeyMock.mockResolvedValue(okMobile);
  });

  it("accepts mobile + desktop scopes on read endpoints", async () => {
    const res = await requireMobileRead(req());
    expect(res.ok).toBe(true);
    const scopes = requireAnyApiKeyMock.mock.calls[0][1] as string[];
    expect(scopes).toEqual(
      expect.arrayContaining(["mobile:read", "mobile:bookings", "desktop:read", "desktop:bookings"]),
    );
  });

  it("accepts mobile + desktop scopes on booking endpoints", async () => {
    const res = await requireMobileBookings(req("http://localhost/api/v1/mobile/bookings"));
    expect(res.ok).toBe(true);
    const scopes = requireAnyApiKeyMock.mock.calls[0][1] as string[];
    expect(scopes).toEqual(expect.arrayContaining(["mobile:bookings", "desktop:bookings"]));
  });

  it("accepts mobile + desktop scopes on write endpoints", async () => {
    const res = await requireMobileWrite(req("http://localhost/api/v1/mobile/overview"));
    expect(res.ok).toBe(true);
    const scopes = requireAnyApiKeyMock.mock.calls[0][1] as string[];
    expect(scopes).toEqual(expect.arrayContaining(["mobile:write", "desktop:write"]));
  });

  it("propagates auth failures without hitting the feature gate", async () => {
    requireAnyApiKeyMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await requireMobileRead(req());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
  });
});
