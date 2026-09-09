import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

import {
  grantDeveloperFullAccess,
  grantDeveloperFullAccessForBusiness,
} from "./developer-access";

function updateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  return { set, where };
}

describe("grantDeveloperFullAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upgrades the founder business to Growth with no expiry", async () => {
    const chain = updateChain();
    updateMock.mockReturnValue(chain);

    const granted = await grantDeveloperFullAccess({
      businessId: "biz-1",
      email: "suvenseoras@gmail.com",
    });

    expect(granted).toBe(true);
    expect(updateMock).toHaveBeenCalledOnce();
    expect(chain.set).toHaveBeenCalledWith({
      plan: "max",
      planExpiresAt: null,
    });
  });

  it("does not touch the database for ordinary customer emails", async () => {
    const granted = await grantDeveloperFullAccess({
      businessId: "biz-1",
      email: "owner@example.com",
    });

    expect(granted).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("grantDeveloperFullAccessForBusiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upgrades when a user on the business is the founder email", async () => {
    const where = vi.fn().mockResolvedValue([{ email: "SuvenSeoras@gmail.com" }]);
    const from = vi.fn().mockReturnValue({ where });
    selectMock.mockReturnValue({ from });
    const chain = updateChain();
    updateMock.mockReturnValue(chain);

    await expect(grantDeveloperFullAccessForBusiness("biz-1")).resolves.toBe(true);
    expect(chain.set).toHaveBeenCalledWith({
      plan: "max",
      planExpiresAt: null,
    });
  });

  it("leaves unrelated businesses unchanged", async () => {
    const where = vi.fn().mockResolvedValue([{ email: "owner@example.com" }]);
    const from = vi.fn().mockReturnValue({ where });
    selectMock.mockReturnValue({ from });

    await expect(grantDeveloperFullAccessForBusiness("biz-1")).resolves.toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
