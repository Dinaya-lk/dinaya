import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeInsertQuery, makeSelectQuery } from "@/test-utils/db-mock";

const requireDesktopReadMock = vi.hoisted(() => vi.fn());
const requireDesktopWriteMock = vi.hoisted(() => vi.fn());
const withRateLimitMock = vi.hoisted(() => vi.fn());
const getStaffDashboardListMock = vi.hoisted(() => vi.fn());
const getStaffDashboardDetailMock = vi.hoisted(() => vi.fn());
const requirePlanLimitMock = vi.hoisted(() => vi.fn());
const dbSelectMock = vi.hoisted(() => vi.fn());
const dbInsertMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/v1/desktop/_shared", () => ({
  requireDesktopRead: requireDesktopReadMock,
  requireDesktopWrite: requireDesktopWriteMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

vi.mock("@/lib/dashboard/staff", () => ({
  getStaffDashboardDetail: getStaffDashboardDetailMock,
  getStaffDashboardList: getStaffDashboardListMock,
  isDashboardStaffStatusFilter: (value: string) => ["all", "active", "inactive"].includes(value),
}));

vi.mock("@/lib/plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plan")>();
  return {
    ...actual,
    requirePlanLimit: requirePlanLimitMock,
  };
});

vi.mock("@/db", () => ({
  db: {
    insert: dbInsertMock,
    select: dbSelectMock,
  },
}));

import { GET, POST } from "./route";

const businessId = "00000000-0000-4000-8000-000000000001";
const createdStaffId = "33333333-3333-4333-8333-333333333333";

const staffDetail = {
  assignedLocations: [],
  assignedServices: [],
  availability: [],
  availableLocations: [],
  availableServices: [],
  recentBookings: [],
  staff: {
    avatarUrl: null,
    bio: "Senior stylist",
    createdAt: "2026-05-28T09:00:00.000Z",
    id: createdStaffId,
    isActive: true,
    name: "Ashan",
  },
};

function authOk() {
  return { ok: true, context: { businessId, deviceId: "device_1" } };
}

describe("GET /api/v1/desktop/staff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopReadMock.mockResolvedValue(authOk());
    requireDesktopWriteMock.mockResolvedValue(authOk());
    getStaffDashboardListMock.mockResolvedValue({
      filters: { limit: 80, q: "", status: "all" },
      rows: [
        {
          assignedLocationsCount: 1,
          assignedServicesCount: 3,
          availabilityWindowCount: 5,
          avatarUrl: null,
          bio: "Senior stylist",
          createdAt: "2026-05-28T09:00:00.000Z",
          futureBookingCount: 4,
          id: "staff_1",
          isActive: true,
          lastBookingAt: "2026-05-28T10:00:00.000Z",
          locationIds: ["location_1"],
          name: "Ashan",
          primaryLocationName: "Kandy",
          todayBookingCount: 2,
        },
      ],
      summary: {
        activeStaff: 1,
        inactiveStaff: 0,
        totalStaff: 1,
        withBio: 1,
      },
    });
  });

  it("returns auth response when desktop key is missing", async () => {
    requireDesktopReadMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/staff");
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(getStaffDashboardListMock).not.toHaveBeenCalled();
  });

  it("returns filtered staff with assignment metrics", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/staff?status=active&q=ashan&limit=20");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getStaffDashboardListMock).toHaveBeenCalledWith(businessId, {
      limit: 20,
      q: "ashan",
      status: "active",
    });
    expect(body.webUrl).toBe("/dashboard/staff");
    expect(body.rows).toHaveLength(1);
    expect(body.summary.activeStaff).toBe(1);
    expect(body.serverTime).toEqual(expect.any(String));
  });

  it("rejects invalid status filters", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/staff?status=archived");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("status is invalid.");
    expect(getStaffDashboardListMock).not.toHaveBeenCalled();
  });

  it("returns a JSON error if staff loading fails unexpectedly", async () => {
    getStaffDashboardListMock.mockRejectedValue(new Error("database unavailable"));

    const req = new NextRequest("http://localhost/api/v1/desktop/staff");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Staff could not be loaded right now. Please refresh or open the web dashboard.");
  });
});

describe("POST /api/v1/desktop/staff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRateLimitMock.mockResolvedValue({ ok: true });
    requireDesktopReadMock.mockResolvedValue(authOk());
    requireDesktopWriteMock.mockResolvedValue(authOk());
    requirePlanLimitMock.mockResolvedValue(undefined);
    dbSelectMock
      .mockReturnValueOnce(makeSelectQuery([{ value: 0 }]))
      .mockReturnValue(makeSelectQuery([]));
    dbInsertMock.mockReturnValue(makeInsertQuery([{ id: createdStaffId }]));
    getStaffDashboardDetailMock.mockResolvedValue(staffDetail);
  });

  it("returns auth response when desktop write key is missing", async () => {
    requireDesktopWriteMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/v1/desktop/staff", {
      body: JSON.stringify({ name: "Ashan" }),
      method: "POST",
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("rejects invalid create payloads", async () => {
    const req = new NextRequest("http://localhost/api/v1/desktop/staff", {
      body: JSON.stringify({ email: "ashan@example.com", phone: "0770000000" }),
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Please check the staff details.");
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("creates a staff member and returns dashboard detail", async () => {
    const insertQuery = makeInsertQuery([{ id: createdStaffId }]);
    dbInsertMock.mockReturnValue(insertQuery);

    const req = new NextRequest("http://localhost/api/v1/desktop/staff", {
      body: JSON.stringify({
        bio: "Senior stylist",
        email: "ashan@example.com",
        name: "Ashan",
        phone: "0770000000",
      }),
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(requirePlanLimitMock).toHaveBeenCalledWith(businessId, "staff", 0);
    expect(insertQuery.values).toHaveBeenCalledWith({
      bio: "Senior stylist",
      businessId,
      name: "Ashan",
    });
    expect(getStaffDashboardDetailMock).toHaveBeenCalledWith(businessId, createdStaffId);
    expect(body.staff).toMatchObject({ id: createdStaffId, name: "Ashan" });
    expect(body.webUrl).toBe(`/dashboard/staff/${createdStaffId}`);
    expect(body.serverTime).toEqual(expect.any(String));
  });
});
