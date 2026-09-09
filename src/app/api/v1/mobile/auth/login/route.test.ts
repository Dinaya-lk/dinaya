import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const bcryptCompareMock = vi.hoisted(() => vi.fn());
const dbSelectMock = vi.hoisted(() => vi.fn());
const dbInsertMock = vi.hoisted(() => vi.fn());
const generateApiKeyMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("bcryptjs", () => ({
  default: { compare: bcryptCompareMock },
}));

vi.mock("@/db", () => ({
  db: {
    insert: dbInsertMock,
    select: dbSelectMock,
  },
}));

vi.mock("@/lib/api-keys", () => ({
  generateApiKey: generateApiKeyMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import { POST as mobilePOST } from "./route";
import { handleDeviceLogin } from "@/app/api/v1/desktop/auth/login/route";

function makeSelectQuery(result: unknown) {
  const query = {
    from: vi.fn(() => query),
    limit: vi.fn(async () => result),
    where: vi.fn(() => query),
  };
  return query;
}

function makeInsertQuery(result: unknown) {
  const query = {
    returning: vi.fn(async () => result),
    values: vi.fn(() => query),
  };
  return query;
}

function validUserAndBusiness() {
  dbSelectMock
    .mockReturnValueOnce(makeSelectQuery([
      {
        id: "00000000-0000-4000-8000-000000000002",
        businessId: "00000000-0000-4000-8000-000000000001",
        email: "owner@example.com",
        name: "Owner",
        passwordHash: "hash",
        role: "owner",
      },
    ]))
    .mockReturnValueOnce(makeSelectQuery([
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Dinaya Salon",
        slug: "dinaya-salon",
        timezone: "Asia/Colombo",
        plan: "pro",
        customDomain: null,
        deletedAt: null,
        isSuspended: false,
      },
    ]));
  dbInsertMock.mockReturnValueOnce(makeInsertQuery([{ id: "key_mobile_1" }]));
  bcryptCompareMock.mockResolvedValue(true);
}

describe("POST /api/v1/mobile/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    generateApiKeyMock.mockReturnValue({ rawKey: "dinaya_mobile_key", keyHash: "hash" });
  });

  it("issues a mobile key with mobile scopes", async () => {
    validUserAndBusiness();

    const req = new NextRequest("http://localhost/api/v1/mobile/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@example.com", password: "secret" }),
    });
    const res = await mobilePOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.mobileKey).toBe("dinaya_mobile_key");
    // Legacy alias keeps older Android builds working.
    expect(body.desktopKey).toBe("dinaya_mobile_key");
    expect(body.auth.keyType).toBe("mobile");
    expect(dbInsertMock.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        keyType: "mobile",
        scopes: ["mobile:read", "mobile:bookings", "mobile:write"],
      }),
    );
  });

  it("desktop login with X-Dinaya-Mobile also issues a mobile key", async () => {
    validUserAndBusiness();

    const req = new NextRequest("http://localhost/api/v1/desktop/auth/login", {
      method: "POST",
      headers: { "X-Dinaya-Mobile": "1", "X-Dinaya-Desktop": "1" },
      body: JSON.stringify({ email: "owner@example.com", password: "secret" }),
    });
    const res = await handleDeviceLogin(req, "desktop");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.auth.keyType).toBe("mobile");
    expect(dbInsertMock.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({ keyType: "mobile" }),
    );
  });

  it("desktop login without the mobile marker still issues a desktop key", async () => {
    validUserAndBusiness();

    const req = new NextRequest("http://localhost/api/v1/desktop/auth/login", {
      method: "POST",
      headers: { "X-Dinaya-Desktop": "1" },
      body: JSON.stringify({ email: "owner@example.com", password: "secret" }),
    });
    const res = await handleDeviceLogin(req, "desktop");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.auth.keyType).toBe("desktop");
    expect(dbInsertMock.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        keyType: "desktop",
        scopes: ["desktop:read", "desktop:bookings", "desktop:write"],
      }),
    );
  });
});
