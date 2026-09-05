import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeSelectQuery, makeUpdateQuery } from "@/test-utils/db-mock";

const requireApiBusinessMock = vi.hoisted(() => vi.fn());
const dbSelectMock = vi.hoisted(() => vi.fn());
const dbUpdateMock = vi.hoisted(() => vi.fn());
const logActivityMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@/lib/api-auth", () => ({
  requireApiBusiness: requireApiBusinessMock,
}));

vi.mock("@/db", () => ({
  db: {
    select: dbSelectMock,
    update: dbUpdateMock,
  },
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: logActivityMock,
}));

import { POST } from "./route";

const authOk = {
  ok: true,
  context: {
    businessId: "00000000-0000-4000-8000-000000000001",
    user: { id: "00000000-0000-4000-8000-000000000002" },
    role: "owner",
  },
};

describe("POST /api/dashboard/bookings/[id]/refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiBusinessMock.mockResolvedValue(authOk);
  });

  it("records a full refund on a successful payment", async () => {
    dbSelectMock
      .mockReturnValueOnce(makeSelectQuery([{ id: "booking_1" }]))
      .mockReturnValueOnce(
        makeSelectQuery([
          {
            id: "pay_1",
            amountLkr: 5500,
            refundedAmountLkr: 0,
            status: "success",
            provider: "payhere",
            payhereOrderId: "PH-1",
            providerOrderId: null,
          },
        ]),
      );
    dbUpdateMock.mockReturnValue(
      makeUpdateQuery([
        {
          id: "pay_1",
          amountLkr: 5500,
          refundedAmountLkr: 5500,
          status: "refunded",
          provider: "payhere",
          payhereOrderId: "PH-1",
          providerOrderId: null,
        },
      ]),
    );

    const req = new NextRequest("http://localhost/api/dashboard/bookings/booking_1/refund", {
      method: "POST",
      body: JSON.stringify({ amountLkr: 5500, reason: "Client cancelled" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "booking_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.payment.status).toBe("refunded");
    expect(body.payment.refundedAmountLkr).toBe(5500);
  });

  it("returns 400 when there is no payment", async () => {
    dbSelectMock
      .mockReturnValueOnce(makeSelectQuery([{ id: "booking_1" }]))
      .mockReturnValueOnce(makeSelectQuery([]));

    const req = new NextRequest("http://localhost/api/dashboard/bookings/booking_1/refund", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "booking_1" }) });
    expect(res.status).toBe(400);
  });
});
