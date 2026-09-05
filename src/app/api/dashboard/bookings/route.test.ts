import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeSelectQuery, makeInsertQuery, makeUpdateQuery, makeDeleteQuery } from "@/test-utils/db-mock";

const requireApiBusinessMock = vi.hoisted(() => vi.fn());

const dbSelectMock = vi.hoisted(() => vi.fn());
const dbInsertMock = vi.hoisted(() => vi.fn());
const dbUpdateMock = vi.hoisted(() => vi.fn());
const dbDeleteMock = vi.hoisted(() => vi.fn());


vi.mock("@/lib/api-auth", () => ({
  requireApiBusiness: requireApiBusinessMock,
}));

vi.mock("@/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
    delete: dbDeleteMock,
  },
}));

import { GET } from "./route";

const authOk = { ok: true, context: { businessId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000002", role: "owner" } };
const authFail = { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };

describe("GET /api/dashboard/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiBusinessMock.mockResolvedValue(authOk);
    
    
    dbSelectMock.mockReturnValue(makeSelectQuery([]));
    dbInsertMock.mockReturnValue(makeInsertQuery([{ id: "row_1" }]));
    dbUpdateMock.mockReturnValue(makeUpdateQuery([{ id: "row_1" }]));
    dbDeleteMock.mockReturnValue(makeDeleteQuery());
  });

  describe("GET", () => {
    it("returns 401 when auth fails", async () => {
      requireApiBusinessMock.mockResolvedValue(authFail);
      const req = new NextRequest("http://localhost/api/dashboard/bookings");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns a response when authorized", async () => {
      const req = new NextRequest("http://localhost/api/dashboard/bookings");
      const res = await GET(req);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });

    it("returns a paginated shape with bookings/hasMore/nextCursor", async () => {
      const req = new NextRequest("http://localhost/api/dashboard/bookings");
      const res = await GET(req);
      const body = await res.json();
      expect(body).toHaveProperty("bookings");
      expect(body).toHaveProperty("hasMore");
      expect(body).toHaveProperty("nextCursor");
      expect(Array.isArray(body.bookings)).toBe(true);
    });

    it("returns 200 paginated shape for tab=today", async () => {
      const req = new NextRequest("http://localhost/api/dashboard/bookings?tab=today");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("bookings");
      expect(body).toHaveProperty("hasMore");
      expect(body).toHaveProperty("nextCursor");
      expect(Array.isArray(body.bookings)).toBe(true);
    });

    it("loads the business timezone before filtering tab=today", async () => {
      dbSelectMock
        .mockReturnValueOnce(makeSelectQuery([{ timezone: "Asia/Colombo" }]))
        .mockReturnValueOnce(makeSelectQuery([]));

      const req = new NextRequest("http://localhost/api/dashboard/bookings?tab=today");
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(dbSelectMock).toHaveBeenCalledTimes(2);
    });

    it("signals hasMore and a nextCursor when more rows exist than PAGE_SIZE", async () => {
      const makeRow = (i: number) => ({
        id: `booking_${i}`,
        clientId: null,
        clientEmail: null,
        clientName: `Client ${i}`,
        clientPhone: "+94770000000",
        endsAt: new Date(`2026-01-01T10:00:00Z`),
        amountLkr: 1000,
        paymentStatus: "success",
        source: "public",
        startsAt: new Date(`2026-01-01T09:00:00Z`),
        status: "completed",
        serviceName: "Haircut",
        staffName: "Staff",
      });
      // PAGE_SIZE is 50 — return 51 rows so the route detects an extra page.
      const rows = Array.from({ length: 51 }, (_, i) => makeRow(i));
      dbSelectMock.mockReturnValue(makeSelectQuery(rows));

      const req = new NextRequest("http://localhost/api/dashboard/bookings");
      const res = await GET(req);
      const body = await res.json();

      expect(body.bookings).toHaveLength(50);
      expect(body.hasMore).toBe(true);
      expect(body.nextCursor).toBe(new Date("2026-01-01T09:00:00Z").toISOString());
    });

    it("rejects an invalid cursor", async () => {
      const req = new NextRequest("http://localhost/api/dashboard/bookings?cursor=not-a-date");
      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });
});
