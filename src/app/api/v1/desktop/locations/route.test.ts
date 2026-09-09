import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeInsertQuery, makeSelectQuery } from "@/test-utils/db-mock";

const requireDesktopReadMock = vi.hoisted(() => vi.fn());
const requireDesktopWriteMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const getLocationsDashboardListMock = vi.hoisted(() => vi.fn());
const getLocationDashboardDetailMock = vi.hoisted(() => vi.fn());
const requireCanAddLocationMock = vi.hoisted(() => vi.fn());
const countLocationsMock = vi.hoisted(() => vi.fn());
const slugifyLocationNameMock = vi.hoisted(() => vi.fn());
const dbSelectMock = vi.hoisted(() => vi.fn());
const dbInsertMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopRead: requireDesktopReadMock,
  requireDesktopWrite: requireDesktopWriteMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/lib/dashboard/locations", () => ({
  getLocationDashboardDetail: getLocationDashboardDetailMock,
  getLocationsDashboardList: getLocationsDashboardListMock,
  isDashboardLocationStatusFilter: (value: string) => ["all", "active", "inactive"].includes(value),
}));

vi.mock("@/lib/locations", () => ({
  countLocations: countLocationsMock,
  requireCanAddLocation: requireCanAddLocationMock,
  slugifyLocationName: slugifyLocationNameMock,
}));

vi.mock("@/db", () => ({
  db: {
    insert: dbInsertMock,
    select: dbSelectMock,
  },
}));

import { GET, POST } from "./route";

const businessId = "00000000-0000-4000-8000-000000000001";
const createdLocationId = "44444444-4444-4444-8444-444444444444";

const locationDetail = {
  assignedStaff: [],
  location: {
    address: "Kandy Road",
    createdAt: "2026-05-28T09:00:00.000Z",
    id: createdLocationId,
    isActive: true,
    isDefault: false,
    name: "Kandy",
    phone: "0810000000",
    slug: "kandy",
    sortOrder: 1,
    timezone: "Asia/Colombo",
  },
  recentBookings: [],
};

function authOk() {
  return { ok: true, context: { businessId, deviceId: "device_1" } };
}

describe("GET /api/v1/desktop/locations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopReadMock.mockResolvedValue(authOk());
    requireDesktopWriteMock.mockResolvedValue(authOk());
    getLocationsDashboardListMock.mockResolvedValue({
      filters: { limit: 80, q: "", status: "all" },
      rows: [
        {
          address: "Kandy Road",
          bookingCount: 12,
          createdAt: "2026-05-28T09:00:00.000Z",
          futureBookingCount: 3,
          id: "location_1",
          isActive: true,
          isDefault: true,
          lastBookingAt: "2026-05-28T10:00:00.000Z",
          name: "Kandy",
          phone: "0810000000",
          primaryStaffCount: 1,
          slug: "kandy",
          sortOrder: 0,
          staffCount: 2,
          timezone: "Asia/Colombo",
        },
      ],
      summary: {
        activeLocations: 1,
        defaultLocations: 1,
        inactiveLocations: 0,
        totalLocations: 1,
        withAddress: 1,
      },
    });
  });

  it("returns auth response when desktop key is missing", async () => {
    requireDesktopReadMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/locations");
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(getLocationsDashboardListMock).not.toHaveBeenCalled();
  });

  it("returns filtered locations with branch metrics", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/locations?status=active&q=kandy&limit=20");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getLocationsDashboardListMock).toHaveBeenCalledWith(businessId, {
      limit: 20,
      q: "kandy",
      status: "active",
    });
    expect(body.webUrl).toBe("/dashboard/locations");
    expect(body.rows).toHaveLength(1);
    expect(body.summary.activeLocations).toBe(1);
    expect(body.serverTime).toEqual(expect.any(String));
  });

  it("rejects invalid status filters", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/locations?status=archived");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("status is invalid.");
    expect(getLocationsDashboardListMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/desktop/locations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopReadMock.mockResolvedValue(authOk());
    requireDesktopWriteMock.mockResolvedValue(authOk());
    requireCanAddLocationMock.mockResolvedValue(undefined);
    countLocationsMock.mockResolvedValue(1);
    slugifyLocationNameMock.mockReturnValue("kandy");
    dbSelectMock.mockReturnValue(makeSelectQuery([]));
    dbInsertMock.mockReturnValue(makeInsertQuery([{ id: createdLocationId }]));
    getLocationDashboardDetailMock.mockResolvedValue(locationDetail);
  });

  it("returns auth response when desktop write key is missing", async () => {
    requireDesktopWriteMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/locations", {
      body: JSON.stringify({ name: "Kandy" }),
      method: "POST",
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("rejects invalid create payloads", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/locations", {
      body: JSON.stringify({ address: "Kandy Road" }),
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Please check the location details.");
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("creates a location and returns dashboard detail", async () => {
    const insertQuery = makeInsertQuery([{ id: createdLocationId }]);
    dbInsertMock.mockReturnValue(insertQuery);

    const req = new NextRequest("http://localhost/api/v1/desktop/locations", {
      body: JSON.stringify({
        address: "Kandy Road",
        name: "Kandy",
        phone: "0810000000",
      }),
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(requireCanAddLocationMock).toHaveBeenCalledWith(businessId);
    expect(slugifyLocationNameMock).toHaveBeenCalledWith("Kandy");
    expect(insertQuery.values).toHaveBeenCalledWith(expect.objectContaining({
      address: "Kandy Road",
      businessId,
      isDefault: false,
      name: "Kandy",
      phone: "0810000000",
      slug: "kandy",
      sortOrder: 1,
      timezone: "Asia/Colombo",
    }));
    expect(getLocationDashboardDetailMock).toHaveBeenCalledWith(businessId, createdLocationId);
    expect(body.location).toMatchObject({ id: createdLocationId, name: "Kandy", slug: "kandy" });
    expect(body.webUrl).toBe("/dashboard/locations");
    expect(body.serverTime).toEqual(expect.any(String));
  });
});
