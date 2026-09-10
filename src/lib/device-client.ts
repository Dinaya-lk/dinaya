import type { NextRequest } from "next/server";

/**
 * Device-client helpers shared by the desktop (`/api/v1/desktop/*`) and
 * mobile (`/api/v1/mobile/*`) bearer-device contracts.
 *
 * Both surfaces accept both `X-Dinaya-Mobile` and `X-Dinaya-Desktop` markers —
 * the markers are only used for client attribution (rate-limit suffixes), never
 * to reject a request. Never log header values or secrets here.
 */

export const MOBILE_HEADER = "x-dinaya-mobile";
export const DESKTOP_HEADER = "x-dinaya-desktop";

export type DeviceClient = "desktop" | "mobile";

export const DESKTOP_KEY_TYPE = "desktop" as const;
export const MOBILE_KEY_TYPE = "mobile" as const;

export const DESKTOP_SCOPES = [
  "desktop:read",
  "desktop:bookings",
  "desktop:write",
] as const;

export const MOBILE_SCOPES = [
  "mobile:read",
  "mobile:bookings",
  "mobile:write",
] as const;

/** Scopes accepted on device read endpoints (both clients, transition period). */
export const DEVICE_READ_SCOPES = [
  "desktop:read",
  "desktop:bookings",
  "mobile:read",
  "mobile:bookings",
] as const;

/** Scopes accepted on booking endpoints (both clients, transition period). */
export const DEVICE_BOOKINGS_SCOPES = [
  "desktop:bookings",
  "mobile:bookings",
] as const;

/** Scopes accepted on device write endpoints (both clients, transition period). */
export const DEVICE_WRITE_SCOPES = ["desktop:write", "mobile:write"] as const;

export function isMobileRequest(req: NextRequest): boolean {
  return req.headers.get(MOBILE_HEADER) !== null;
}

export function isDesktopRequest(req: NextRequest): boolean {
  return req.headers.get(DESKTOP_HEADER) !== null;
}

/**
 * Resolve which device client a login should issue a key for.
 * `X-Dinaya-Mobile` wins when present; otherwise fall back to `defaultClient`.
 */
export function resolveDeviceClient(
  req: NextRequest,
  defaultClient: DeviceClient = "desktop",
): DeviceClient {
  if (isMobileRequest(req)) return "mobile";
  if (isDesktopRequest(req)) return "desktop";
  return defaultClient;
}

/**
 * Build a rate-limit key suffix that logs the client marker without leaking
 * secrets: `{businessId}:{deviceId}:{mobile|desktop}`.
 */
export function deviceRateLimitSuffix(
  req: NextRequest,
  businessId: string,
  deviceId: string | null,
): string {
  const client: DeviceClient = isMobileRequest(req) ? "mobile" : "desktop";
  return `${businessId}:${deviceId ?? "unknown"}:${client}`;
}

/** Suffix for unauthenticated device endpoints (login/register): `mobile|desktop`. */
export function anonymousDeviceRateLimitSuffix(req: NextRequest): string {
  return isMobileRequest(req) ? "mobile" : "desktop";
}
