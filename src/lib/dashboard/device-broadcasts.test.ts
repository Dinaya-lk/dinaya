import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeInsertQuery, makeUpdateQuery } from "@/test-utils/db-mock";

const dbInsertMock = vi.hoisted(() => vi.fn());
const dbUpdateMock = vi.hoisted(() => vi.fn());
const countMatchingRecipientsMock = vi.hoisted(() => vi.fn());
const sendBroadcastMock = vi.hoisted(() => vi.fn());

vi.mock("@/db", () => ({
  db: {
    insert: dbInsertMock,
    update: dbUpdateMock,
  },
}));

vi.mock("@/lib/broadcasts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/broadcasts")>();
  return {
    ...actual,
    countMatchingRecipients: countMatchingRecipientsMock,
    sendBroadcast: sendBroadcastMock,
  };
});

import { createDeviceBroadcast } from "./device-broadcasts";

const BUSINESS_ID = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-05-28T09:00:00.000Z");

const draftInput = {
  name: "May offer",
  channel: "email" as const,
  subject: "May offer",
  body: "Book this week for a discount.",
  audienceType: "all" as const,
};

const createdRow = {
  id: "broadcast_1",
  businessId: BUSINESS_ID,
  name: "May offer",
  channel: "email",
  subject: "May offer",
  body: "Book this week for a discount.",
  audienceType: "all",
  audienceFilter: null,
  status: "draft",
  recipientCount: 5,
  sentCount: 0,
  skippedCount: 0,
  failedCount: 0,
  sentAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

describe("createDeviceBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countMatchingRecipientsMock.mockResolvedValue(5);
    sendBroadcastMock.mockResolvedValue({
      failedCount: 0,
      recipientCount: 5,
      sentCount: 5,
      skippedCount: 0,
    });
    dbInsertMock.mockReturnValue(makeInsertQuery([createdRow]));
    dbUpdateMock.mockReturnValue(makeUpdateQuery([{ ...createdRow, status: "sent" }]));
  });

  it("creates a draft when sendNow is omitted", async () => {
    const insertQuery = makeInsertQuery([createdRow]);
    dbInsertMock.mockReturnValue(insertQuery);

    const result = await createDeviceBroadcast(BUSINESS_ID, draftInput);

    expect(countMatchingRecipientsMock).toHaveBeenCalledWith(BUSINESS_ID, "all", null);
    expect(insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceFilter: null,
        audienceType: "all",
        body: "Book this week for a discount.",
        businessId: BUSINESS_ID,
        channel: "email",
        name: "May offer",
        recipientCount: 5,
        status: "draft",
        subject: "May offer",
      }),
    );
    expect(sendBroadcastMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "created",
      broadcast: {
        audienceFilter: null,
        audienceType: "all",
        body: "Book this week for a discount.",
        channel: "email",
        id: "broadcast_1",
        name: "May offer",
        recipientCount: 5,
        status: "draft",
        subject: "May offer",
      },
    });
  });

  it("returns invalid when no eligible clients match the audience", async () => {
    countMatchingRecipientsMock.mockResolvedValue(0);

    const result = await createDeviceBroadcast(BUSINESS_ID, draftInput);

    expect(result).toEqual({
      status: "invalid",
      error: "No eligible clients match this audience. Clients who opted out are excluded.",
    });
    expect(dbInsertMock).not.toHaveBeenCalled();
    expect(sendBroadcastMock).not.toHaveBeenCalled();
  });

  it("returns invalid when audienceType is stage without a stage filter", async () => {
    const result = await createDeviceBroadcast(BUSINESS_ID, {
      ...draftInput,
      audienceType: "stage",
    });

    expect(result).toEqual({
      status: "invalid",
      error: "Choose a client stage for this broadcast.",
    });
    expect(countMatchingRecipientsMock).not.toHaveBeenCalled();
    expect(dbInsertMock).not.toHaveBeenCalled();
  });
});
