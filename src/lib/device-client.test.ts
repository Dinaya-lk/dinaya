import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  anonymousDeviceRateLimitSuffix,
  deviceRateLimitSuffix,
  isDesktopRequest,
  isMobileRequest,
  resolveDeviceClient,
} from "./device-client";

function req(headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/v1/mobile/bootstrap", { headers });
}

describe("device-client markers", () => {
  it("detects the mobile marker", () => {
    expect(isMobileRequest(req({ "X-Dinaya-Mobile": "1" }))).toBe(true);
    expect(isMobileRequest(req({ "X-Dinaya-Desktop": "1" }))).toBe(false);
    expect(isMobileRequest(req())).toBe(false);
  });

  it("detects the desktop marker", () => {
    expect(isDesktopRequest(req({ "X-Dinaya-Desktop": "1" }))).toBe(true);
    expect(isDesktopRequest(req({ "X-Dinaya-Mobile": "1" }))).toBe(false);
  });

  it("accepts both markers at once (Android sends both on desktop paths)", () => {
    const both = req({ "X-Dinaya-Mobile": "1", "X-Dinaya-Desktop": "1" });
    expect(isMobileRequest(both)).toBe(true);
    expect(isDesktopRequest(both)).toBe(true);
    // Mobile wins for key issuance.
    expect(resolveDeviceClient(both, "desktop")).toBe("mobile");
  });

  it("resolves the default client when no marker is present", () => {
    expect(resolveDeviceClient(req(), "desktop")).toBe("desktop");
    expect(resolveDeviceClient(req(), "mobile")).toBe("mobile");
  });

  it("logs the mobile marker in the rate-limit suffix", () => {
    expect(deviceRateLimitSuffix(req({ "X-Dinaya-Mobile": "1" }), "biz_1", "dev_1")).toBe(
      "biz_1:dev_1:mobile",
    );
    expect(deviceRateLimitSuffix(req({ "X-Dinaya-Desktop": "1" }), "biz_1", "dev_1")).toBe(
      "biz_1:dev_1:desktop",
    );
    expect(deviceRateLimitSuffix(req(), "biz_1", null)).toBe("biz_1:unknown:desktop");
  });

  it("suffixes anonymous endpoints with the client marker", () => {
    expect(anonymousDeviceRateLimitSuffix(req({ "X-Dinaya-Mobile": "1" }))).toBe("mobile");
    expect(anonymousDeviceRateLimitSuffix(req())).toBe("desktop");
  });
});
