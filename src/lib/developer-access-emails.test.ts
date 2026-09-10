import { afterEach, describe, expect, it } from "vitest";
import {
  DEVELOPER_FULL_ACCESS_PLAN,
  FOUNDER_FULL_ACCESS_EMAILS,
  getDeveloperFullAccessEmails,
  getPlatformAdminAllowlistEmails,
  isAllowlistedPlatformAdminEmail,
  isDeveloperFullAccessEmail,
  normalizeEmail,
} from "./developer-access-emails";

const ORIGINAL_DEVELOPER = process.env.DEVELOPER_FULL_ACCESS_EMAILS;
const ORIGINAL_ADMIN = process.env.PLATFORM_ADMIN_EMAILS;

afterEach(() => {
  if (ORIGINAL_DEVELOPER === undefined) {
    delete process.env.DEVELOPER_FULL_ACCESS_EMAILS;
  } else {
    process.env.DEVELOPER_FULL_ACCESS_EMAILS = ORIGINAL_DEVELOPER;
  }
  if (ORIGINAL_ADMIN === undefined) {
    delete process.env.PLATFORM_ADMIN_EMAILS;
  } else {
    process.env.PLATFORM_ADMIN_EMAILS = ORIGINAL_ADMIN;
  }
});

describe("developer full-access emails", () => {
  it("always includes the founder Gmail as a developer account", () => {
    delete process.env.DEVELOPER_FULL_ACCESS_EMAILS;
    expect(FOUNDER_FULL_ACCESS_EMAILS).toContain("suvenseoras@gmail.com");
    expect(isDeveloperFullAccessEmail("suvenseoras@gmail.com")).toBe(true);
    expect(isDeveloperFullAccessEmail("  SuvenSeoras@Gmail.com  ")).toBe(true);
    expect(DEVELOPER_FULL_ACCESS_PLAN).toBe("max");
  });

  it("does not treat unrelated customer emails as developers", () => {
    delete process.env.DEVELOPER_FULL_ACCESS_EMAILS;
    expect(isDeveloperFullAccessEmail("owner@example.com")).toBe(false);
    expect(isDeveloperFullAccessEmail(null)).toBe(false);
    expect(isDeveloperFullAccessEmail("")).toBe(false);
  });

  it("merges extra developer emails from DEVELOPER_FULL_ACCESS_EMAILS", () => {
    process.env.DEVELOPER_FULL_ACCESS_EMAILS = "qa@dinaya.lk, extra@ardeno.studio";
    expect(getDeveloperFullAccessEmails()).toEqual(
      expect.arrayContaining([
        "suvenseoras@gmail.com",
        "qa@dinaya.lk",
        "extra@ardeno.studio",
      ]),
    );
    expect(isDeveloperFullAccessEmail("qa@dinaya.lk")).toBe(true);
  });

  it("treats founder and PLATFORM_ADMIN_EMAILS as platform admins", () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
    expect(isAllowlistedPlatformAdminEmail("suvenseoras@gmail.com")).toBe(true);

    process.env.PLATFORM_ADMIN_EMAILS = "admin@dinaya.lk";
    expect(getPlatformAdminAllowlistEmails()).toEqual(
      expect.arrayContaining(["suvenseoras@gmail.com", "admin@dinaya.lk"]),
    );
    expect(isAllowlistedPlatformAdminEmail("admin@dinaya.lk")).toBe(true);
    expect(isAllowlistedPlatformAdminEmail("owner@example.com")).toBe(false);
  });

  it("normalizes emails for allowlist comparison", () => {
    expect(normalizeEmail("  Foo@Dinaya.lk ")).toBe("foo@dinaya.lk");
  });
});
