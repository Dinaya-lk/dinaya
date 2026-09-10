import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeInsertQuery, makeSelectQuery } from "@/test-utils/db-mock";

const dbSelectMock = vi.hoisted(() => vi.fn());
const dbInsertMock = vi.hoisted(() => vi.fn());
const logActivityMock = vi.hoisted(() => vi.fn());
const getDealDashboardDetailMock = vi.hoisted(() => vi.fn());
const notifyDealAudienceMock = vi.hoisted(() => vi.fn());

vi.mock("@/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
  },
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: logActivityMock,
}));

vi.mock("@/lib/dashboard/deals", () => ({
  getDealDashboardDetail: getDealDashboardDetailMock,
}));

vi.mock("@/lib/deals/notify", () => ({
  notifyDealAudience: notifyDealAudienceMock,
}));

import { createDeviceDeal } from "./device-deals";

const BUSINESS_ID = "00000000-0000-4000-8000-000000000001";
const SERVICE_ID = "00000000-0000-4000-8000-000000000010";
const STAFF_ID = "00000000-0000-4000-8000-000000000011";
const LOCATION_ID = "00000000-0000-4000-8000-000000000012";
const DEAL_ID = "00000000-0000-4000-8000-000000000013";

const dealDetail = {
  deal: {
    apptWindowEnd: "2026-06-01T17:00:00.000Z",
    apptWindowStart: "2026-06-01T09:00:00.000Z",
    conversionPercent: null,
    createdAt: "2026-05-28T09:00:00.000Z",
    dealWindowEnd: "2026-05-30T09:00:00.000Z",
    dealWindowStart: "2026-05-28T09:00:00.000Z",
    discountPercent: 20,
    discountedPriceLkr: 2000,
    displayStatus: "active",
    id: DEAL_ID,
    impressionCount: 0,
    slotsRedeemed: 0,
    slotsRemaining: 5,
    slotsTotal: 5,
    status: "active",
  },
  location: { id: LOCATION_ID, name: "Kandy", timezone: "Asia/Colombo" },
  recentBookings: [],
  service: {
    depositPercent: 0,
    durationMinutes: 45,
    id: SERVICE_ID,
    name: "Haircut",
    priceLkr: 2500,
    requiresPayment: true,
  },
  staff: { id: STAFF_ID, name: "Ashan" },
};

const createInput = {
  serviceId: SERVICE_ID,
  locationId: LOCATION_ID,
  staffId: STAFF_ID,
  discountPercent: 20,
  slotsTotal: 5,
  dealWindowStart: "2026-05-28T09:00:00.000Z",
  dealWindowEnd: "2026-05-30T09:00:00.000Z",
  apptWindowStart: "2026-06-01T09:00:00.000Z",
  apptWindowEnd: "2026-06-01T17:00:00.000Z",
};

function queueSelects(...results: unknown[]) {
  const queue = [...results];
  dbSelectMock.mockImplementation(() => makeSelectQuery(queue.shift() ?? []));
}

describe("createDeviceDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logActivityMock.mockResolvedValue(undefined);
    notifyDealAudienceMock.mockResolvedValue({ recipientCount: 0, sentCount: 0 });
    getDealDashboardDetailMock.mockResolvedValue(dealDetail);
    dbInsertMock.mockReturnValue(makeInsertQuery([{ id: DEAL_ID }]));
  });

  it("returns a created deal on the happy path", async () => {
    queueSelects(
      [{ timezone: "Asia/Colombo" }],
      [{ id: SERVICE_ID }],
      [{ id: LOCATION_ID }],
      [{ id: STAFF_ID }],
    );

    const result = await createDeviceDeal(BUSINESS_ID, createInput);

    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    expect(result.deal).toEqual(dealDetail);
    expect(logActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      action: "created",
      businessId: BUSINESS_ID,
      entity: "deal",
      entityId: DEAL_ID,
      meta: expect.objectContaining({
        discountPercent: 20,
        notifyClients: false,
        serviceId: SERVICE_ID,
        slotsTotal: 5,
      }),
    }));
    expect(notifyDealAudienceMock).not.toHaveBeenCalled();
    expect(getDealDashboardDetailMock).toHaveBeenCalledWith(BUSINESS_ID, DEAL_ID);
  });

  it("interprets naive windows in the business timezone", async () => {
    const insertQuery = makeInsertQuery([{ id: DEAL_ID }]);
    dbInsertMock.mockReturnValue(insertQuery);
    queueSelects(
      [{ timezone: "Asia/Colombo" }],
      [{ id: SERVICE_ID }],
      [{ id: LOCATION_ID }],
    );

    const result = await createDeviceDeal(BUSINESS_ID, {
      serviceId: SERVICE_ID,
      locationId: LOCATION_ID,
      discountPercent: 20,
      slotsTotal: 5,
      dealWindowStart: "2026-05-28T09:00:00",
      dealWindowEnd: "2026-05-30T09:00:00",
      apptWindowStart: "2026-06-01T09:00",
      apptWindowEnd: "2026-06-01T17:00",
    });

    expect(result.status).toBe("created");
    expect(insertQuery.values).toHaveBeenCalledWith(expect.objectContaining({
      apptWindowEnd: new Date("2026-06-01T11:30:00.000Z"),
      apptWindowStart: new Date("2026-06-01T03:30:00.000Z"),
      dealWindowEnd: new Date("2026-05-30T03:30:00.000Z"),
      dealWindowStart: new Date("2026-05-28T03:30:00.000Z"),
      staffId: null,
      status: "active",
    }));
  });

  it("returns invalid when the deal window ends before it starts", async () => {
    queueSelects([{ timezone: "Asia/Colombo" }]);

    const result = await createDeviceDeal(BUSINESS_ID, {
      ...createInput,
      dealWindowStart: "2026-05-30T09:00:00.000Z",
      dealWindowEnd: "2026-05-28T09:00:00.000Z",
    });

    expect(result).toEqual({
      status: "invalid",
      error: "Deal end must be after deal start.",
    });
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("returns invalid when the appointment window ends before it starts", async () => {
    queueSelects([{ timezone: "Asia/Colombo" }]);

    const result = await createDeviceDeal(BUSINESS_ID, {
      ...createInput,
      apptWindowStart: "2026-06-01T17:00:00.000Z",
      apptWindowEnd: "2026-06-01T09:00:00.000Z",
    });

    expect(result).toEqual({
      status: "invalid",
      error: "Appointment end must be after appointment start.",
    });
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("returns not_found when the service is missing or inactive", async () => {
    queueSelects([{ timezone: "Asia/Colombo" }], []);

    const result = await createDeviceDeal(BUSINESS_ID, createInput);

    expect(result).toEqual({
      status: "not_found",
      error: "Service not found.",
    });
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("returns not_found when the location is missing or inactive", async () => {
    queueSelects(
      [{ timezone: "Asia/Colombo" }],
      [{ id: SERVICE_ID }],
      [],
    );

    const result = await createDeviceDeal(BUSINESS_ID, createInput);

    expect(result).toEqual({
      status: "not_found",
      error: "Location not found.",
    });
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("returns invalid when staff is not assigned to the service", async () => {
    queueSelects(
      [{ timezone: "Asia/Colombo" }],
      [{ id: SERVICE_ID }],
      [{ id: LOCATION_ID }],
      [],
    );

    const result = await createDeviceDeal(BUSINESS_ID, createInput);

    expect(result).toEqual({
      status: "invalid",
      error: "Staff member cannot perform this service.",
    });
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("notifies past clients when notifyClients is true", async () => {
    queueSelects(
      [{ timezone: "Asia/Colombo" }],
      [{ id: SERVICE_ID }],
      [{ id: LOCATION_ID }],
      [{ id: STAFF_ID }],
    );
    notifyDealAudienceMock.mockResolvedValue({ recipientCount: 3, sentCount: 2 });

    const result = await createDeviceDeal(BUSINESS_ID, {
      ...createInput,
      notifyClients: true,
    });

    expect(result.status).toBe("created");
    expect(notifyDealAudienceMock).toHaveBeenCalledWith({
      audience: "past_clients",
      businessId: BUSINESS_ID,
      dealId: DEAL_ID,
    });
  });

  it("returns invalid for a malformed body without querying the catalog", async () => {
    const result = await createDeviceDeal(BUSINESS_ID, {
      discountPercent: 5,
    });

    expect(result).toEqual({
      status: "invalid",
      error: "Please check the deal details.",
    });
    expect(dbSelectMock).not.toHaveBeenCalled();
    expect(dbInsertMock).not.toHaveBeenCalled();
  });
});
