import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeInsertQuery, makeSelectQuery, makeUpdateQuery } from "@/test-utils/db-mock";

const dbSelectMock = vi.hoisted(() => vi.fn());
const dbInsertMock = vi.hoisted(() => vi.fn());
const dbUpdateMock = vi.hoisted(() => vi.fn());
const isRequestedSlotAvailableMock = vi.hoisted(() => vi.fn());
const resolveBookingLocationIdMock = vi.hoisted(() => vi.fn());
const logActivityMock = vi.hoisted(() => vi.fn());
const rescheduleBookingMock = vi.hoisted(() => vi.fn());

vi.mock("@/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
  },
}));

vi.mock("@/lib/booking-availability", () => ({
  isRequestedSlotAvailable: isRequestedSlotAvailableMock,
}));

vi.mock("@/lib/locations", () => ({
  resolveBookingLocationId: resolveBookingLocationIdMock,
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: logActivityMock,
}));

vi.mock("@/lib/booking-reschedule", () => ({
  rescheduleBooking: rescheduleBookingMock,
}));

import {
  cancelDeviceBooking,
  createDeviceWalkInBooking,
} from "./device-bookings";

const BUSINESS_ID = "00000000-0000-4000-8000-000000000001";
const SERVICE_ID = "00000000-0000-4000-8000-000000000010";
const STAFF_ID = "00000000-0000-4000-8000-000000000011";
const LOCATION_ID = "00000000-0000-4000-8000-000000000012";
const BOOKING_ID = "00000000-0000-4000-8000-000000000013";
const CLIENT_ID = "00000000-0000-4000-8000-000000000014";

const walkInInput = {
  clientName: "Kasun Perera",
  clientPhone: "0771234567",
  serviceId: SERVICE_ID,
  staffId: STAFF_ID,
  startsAt: "2026-09-04T10:00:00.000Z",
};

const serviceRow = {
  id: SERVICE_ID,
  name: "Haircut",
  durationMinutes: 45,
  beforeBuffer: 0,
  afterBuffer: 0,
  minimumNoticeHours: 0,
  maximumAdvanceDays: 90,
  isActive: true,
};

const staffRow = {
  id: STAFF_ID,
  name: "Ashan",
  isActive: true,
};

function queueSelects(...results: unknown[]) {
  const queue = [...results];
  dbSelectMock.mockImplementation(() => makeSelectQuery(queue.shift() ?? []));
}

describe("createDeviceWalkInBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logActivityMock.mockResolvedValue(undefined);
    resolveBookingLocationIdMock.mockResolvedValue(LOCATION_ID);
    isRequestedSlotAvailableMock.mockResolvedValue(true);
    dbInsertMock.mockReturnValue(makeInsertQuery([]));
    dbUpdateMock.mockReturnValue(makeUpdateQuery([]));
  });

  it("returns not_found when the service is missing or inactive", async () => {
    queueSelects([{ timezone: "Asia/Colombo" }], []);

    const result = await createDeviceWalkInBooking(BUSINESS_ID, walkInInput);

    expect(result).toEqual({
      status: "not_found",
      error: "Service is not available.",
    });
    expect(isRequestedSlotAvailableMock).not.toHaveBeenCalled();
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("returns conflict when the requested slot is unavailable", async () => {
    isRequestedSlotAvailableMock.mockResolvedValue(false);
    queueSelects(
      [{ timezone: "Asia/Colombo" }],
      [serviceRow],
      [staffRow],
      [],
    );

    const result = await createDeviceWalkInBooking(BUSINESS_ID, walkInInput);

    expect(result).toEqual({
      status: "conflict",
      error: "That time is no longer available.",
    });
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("interprets naive start times in the business timezone", async () => {
    isRequestedSlotAvailableMock.mockResolvedValue(false);
    queueSelects(
      [{ timezone: "Asia/Colombo" }],
      [serviceRow],
      [staffRow],
      [],
    );

    await createDeviceWalkInBooking(BUSINESS_ID, {
      ...walkInInput,
      startsAt: "2026-09-04T09:00:00",
    });

    expect(isRequestedSlotAvailableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        start: new Date("2026-09-04T03:30:00.000Z"),
      }),
    );
  });

  it("returns a confirmed walk-in booking on the happy path", async () => {
    const startsAt = new Date("2026-09-04T10:00:00.000Z");
    const endsAt = new Date("2026-09-04T10:45:00.000Z");
    const createdAt = new Date("2026-09-04T09:00:00.000Z");

    queueSelects(
      [{ timezone: "Asia/Colombo" }],
      [serviceRow],
      [staffRow],
      [],
    );
    dbInsertMock
      .mockReturnValueOnce(makeInsertQuery([{ id: CLIENT_ID }]))
      .mockReturnValueOnce(makeInsertQuery([{
        id: BOOKING_ID,
        clientId: CLIENT_ID,
        clientName: "Kasun Perera",
        clientPhone: "+94771234567",
        clientEmail: null,
        staffId: STAFF_ID,
        startsAt,
        endsAt,
        status: "confirmed",
        source: "manual",
        createdAt,
      }]));

    const result = await createDeviceWalkInBooking(BUSINESS_ID, walkInInput);

    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    expect(result.booking).toMatchObject({
      id: BOOKING_ID,
      clientId: CLIENT_ID,
      clientName: "Kasun Perera",
      clientPhone: "+94771234567",
      serviceName: "Haircut",
      staffId: STAFF_ID,
      staffName: "Ashan",
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      status: "confirmed",
      webUrl: `/dashboard/bookings/${BOOKING_ID}`,
    });
    expect(logActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      action: "created_desktop",
      businessId: BUSINESS_ID,
      entity: "booking",
      entityId: BOOKING_ID,
    }));
  });
});

describe("cancelDeviceBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logActivityMock.mockResolvedValue(undefined);
  });

  it("sets cancelledAt and returns the cancelled booking", async () => {
    queueSelects([{
      id: BOOKING_ID,
      status: "confirmed",
      createdAt: new Date("2026-09-04T09:00:00.000Z"),
    }]);
    dbUpdateMock.mockReturnValueOnce(makeUpdateQuery([{
      id: BOOKING_ID,
      status: "cancelled",
      createdAt: new Date("2026-09-04T09:00:00.000Z"),
    }]));

    const result = await cancelDeviceBooking(BUSINESS_ID, BOOKING_ID, "Client walked out");

    expect(result.status).toBe("cancelled");
    if (result.status !== "cancelled") return;
    expect(result.booking).toEqual({
      id: BOOKING_ID,
      status: "cancelled",
      revisionTs: "2026-09-04T09:00:00.000Z",
    });
    expect(dbUpdateMock).toHaveBeenCalled();
  });
});
