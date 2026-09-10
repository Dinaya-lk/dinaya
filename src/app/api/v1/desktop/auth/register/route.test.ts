import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const registerBusinessAccountMock = vi.hoisted(() => vi.fn());
const createDesktopAuthSessionMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/register-business-account", () => ({
  RegisterAccountError: class RegisterAccountError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  registerBusinessAccount: registerBusinessAccountMock,
}));

vi.mock("@/lib/desktop-auth-session", () => ({
  DesktopAuthError: class DesktopAuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  createDesktopAuthSession: createDesktopAuthSessionMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import { POST } from "./route";

describe("POST /api/v1/desktop/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    registerBusinessAccountMock.mockResolvedValue({ businessId: "00000000-0000-4000-8000-000000000001" });
    createDesktopAuthSessionMock.mockResolvedValue({
      desktopKey: "dinaya_desktop_key",
      auth: {
        keyId: "key_1",
        keyType: "desktop",
        deviceId: "device_1",
        deviceName: "Dinaya Desktop",
      },
      business: {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Dinaya Salon",
        slug: "dinaya-salon",
        timezone: "Asia/Colombo",
        plan: "trial",
        customDomain: null,
      },
      user: {
        id: "00000000-0000-4000-8000-000000000002",
        name: "Owner",
        email: "owner@example.com",
        role: "owner",
      },
      featureFlags: { desktopNativeBookings: true },
    });
  });

  it("registers a business and returns a desktop session", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/v1/desktop/auth/register", {
        body: JSON.stringify({
          name: "Owner",
          businessName: "Dinaya Salon",
          slug: "dinaya-salon",
          email: "owner@example.com",
          password: "Password123!",
          businessType: "salon_barber",
          language: "en",
          deviceName: "Windows PC",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    expect(res.status).toBe(201);
    expect(registerBusinessAccountMock).toHaveBeenCalledOnce();
    expect(createDesktopAuthSessionMock).toHaveBeenCalledWith({
      client: "desktop",
      deviceName: "Windows PC",
      email: "owner@example.com",
      password: "Password123!",
    });
    const body = await res.json();
    expect(body.desktopKey).toBe("dinaya_desktop_key");
    expect(body.business.slug).toBe("dinaya-salon");
  });

  it("returns validation errors for invalid payloads", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/v1/desktop/auth/register", {
        body: JSON.stringify({ email: "not-an-email" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    expect(res.status).toBe(400);
    expect(registerBusinessAccountMock).not.toHaveBeenCalled();
  });
});
