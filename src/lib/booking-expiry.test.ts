import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock("@/lib/activity-log", () => ({ logActivity: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/deals/claim", () => ({ releaseDealSlotForBooking: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/webhooks", () => ({ dispatchWebhooks: vi.fn().mockResolvedValue(undefined) }));

import { expireAbandonedPayhereBookings } from "@/lib/booking-expiry";

describe("expireAbandonedPayhereBookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero when there are no stale bookings", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ orderBy }));
    const leftJoinServices = vi.fn(() => ({ where }));
    const innerJoinPayments = vi.fn(() => ({ leftJoin: leftJoinServices }));
    const from = vi.fn(() => ({ innerJoin: innerJoinPayments }));
    selectMock.mockReturnValue({ from });

    const result = await expireAbandonedPayhereBookings();

    expect(result).toEqual({ expired: 0, checked: 0 });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("cancels stale pending PayHere bookings and marks payments failed", async () => {
    const staleBooking = {
      bookingId: "booking-1",
      businessId: "biz-1",
      status: "pending",
      clientName: "Ada",
      clientPhone: "+94771234567",
      serviceName: "Haircut",
      startsAt: new Date("2026-06-20T09:00:00.000Z"),
    };

    const limit = vi.fn().mockResolvedValue([staleBooking]);
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ orderBy }));
    const leftJoinServices = vi.fn(() => ({ where }));
    const innerJoinPayments = vi.fn(() => ({ leftJoin: leftJoinServices }));
    const from = vi.fn(() => ({ innerJoin: innerJoinPayments }));
    selectMock.mockReturnValue({ from });

    const returning = vi.fn().mockResolvedValue([{ id: staleBooking.bookingId }]);
    const updateWhere = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where: updateWhere }));
    updateMock.mockReturnValue({ set });

    const result = await expireAbandonedPayhereBookings();

    expect(result).toEqual({ expired: 1, checked: 1 });
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "cancelled",
        cancellationReason: "Payment not completed in time.",
      }),
    );
  });
});
