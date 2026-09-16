import { describe, expect, it } from "vitest";
import { FOUNDER_DEMO_NAME_PREFIX } from "./founder-demo-seed";
import { FOUNDER_FULL_ACCESS_EMAILS } from "./developer-access-emails";

describe("founder demo catalog", () => {
  it("tags demo rows so they are obvious in the app", () => {
    expect(FOUNDER_DEMO_NAME_PREFIX).toBe("Demo ·");
    expect(FOUNDER_FULL_ACCESS_EMAILS).toContain("suvenseoras@gmail.com");
  });
});
