import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const bcryptCompareMock = vi.hoisted(() => vi.fn());
const dbSelectMock = vi.hoisted(() => vi.fn());
const dbInsertMock = vi.hoisted(() => vi.fn());
const dbUpdateMock = vi.hoisted(() => vi.fn());
const generateApiKeyMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("bcryptjs", () => ({
  default: { compare: bcryptCompareMock },
}));

vi.mock("@/db", () => ({
  db: {
    insert: dbInsertMock,
    select: dbSelectMock,
    update: dbUpdateMock,
  },
}));

vi.mock("@/lib/api-keys", () => ({
  generateApiKey: generateApiKeyMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import { POST } from "./route";

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

function makeUpdateQuery() {
  const query = {
    set: vi.fn(() => query),
    where: vi.fn(async () => undefined),
  };
  return query;
}

describe("POST /api/v1/desktop/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    generateApiKeyMock.mockReturnValue({ rawKey: "dinaya_desktop_key", keyHash: "hash" });
  });

  it("creates a scoped desktop key for valid credentials", async () => {
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
    dbInsertMock.mockReturnValueOnce(makeInsertQuery([{ id: "key_1" }]));
    bcryptCompareMock.mockResolvedValue(true);

    const req = new NextRequest("http://localhost/api/v1/desktop/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "owner@example.com",
        password: "secret",
        deviceName: "Windows PC",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.desktopKey).toBe("dinaya_desktop_key");
    expect(body.business.id).toBe("00000000-0000-4000-8000-000000000001");
    expect(body.user.email).toBe("owner@example.com");
    expect(dbInsertMock).toHaveBeenCalled();
    expect(dbInsertMock.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "00000000-0000-4000-8000-000000000001",
        keyType: "desktop",
        scopes: ["desktop:read", "desktop:bookings", "desktop:write"],
      }),
    );
  });

  it("promotes the founder Gmail account to Growth on device login", async () => {
    dbSelectMock
      .mockReturnValueOnce(makeSelectQuery([
        {
          id: "00000000-0000-4000-8000-000000000002",
          businessId: "00000000-0000-4000-8000-000000000001",
          email: "suvenseoras@gmail.com",
          name: "Suven",
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
          plan: "trial",
          customDomain: null,
          deletedAt: null,
          isSuspended: false,
        },
      ]));
    dbInsertMock.mockReturnValueOnce(makeInsertQuery([{ id: "key_1" }]));
    dbUpdateMock.mockReturnValueOnce(makeUpdateQuery());
    bcryptCompareMock.mockResolvedValue(true);

    const req = new NextRequest("http://localhost/api/v1/desktop/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "SuvenSeoras@gmail.com",
        password: "secret",
        deviceName: "Pixel",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.business.plan).toBe("max");
    expect(dbUpdateMock).toHaveBeenCalledOnce();
  });

  it("rejects invalid credentials", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectQuery([]));

    const req = new NextRequest("http://localhost/api/v1/desktop/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "missing@example.com", password: "secret" }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain("Invalid");
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("rejects wrong passwords without creating a key", async () => {
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
    bcryptCompareMock.mockResolvedValue(false);

    const req = new NextRequest("http://localhost/api/v1/desktop/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@example.com", password: "wrong" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("rejects inactive businesses before issuing a key", async () => {
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
          isSuspended: true,
        },
      ]));

    const req = new NextRequest("http://localhost/api/v1/desktop/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@example.com", password: "secret" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(bcryptCompareMock).not.toHaveBeenCalled();
    expect(dbInsertMock).not.toHaveBeenCalled();
  });
});
