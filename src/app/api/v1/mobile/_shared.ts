import { NextRequest, NextResponse } from "next/server";
import { requireAnyApiKey } from "@/lib/api-key-auth";
import { grantDeveloperFullAccessForBusiness } from "@/lib/developer-access";
import {
  DEVICE_BOOKINGS_SCOPES,
  DEVICE_READ_SCOPES,
  DEVICE_WRITE_SCOPES,
} from "@/lib/device-client";
import { desktopNativeBookingsEnabled, mobileNativeBookingsEnabled } from "@/lib/desktop-native";

/**
 * Mobile-native auth guards for `/api/v1/mobile/*`.
 *
 * Accepts both `mobile:*` and `desktop:*` scopes so existing desktop device
 * keys keep working while the Android app migrates to `mobile` keys, and
 * accepts both `X-Dinaya-Mobile` and `X-Dinaya-Desktop` markers (markers are
 * attribution only, never a rejection reason).
 */
function featureDisabledResponse() {
  return NextResponse.json(
    { error: "Mobile native modules are not enabled for this business." },
    { status: 403 },
  );
}

function deviceModulesEnabled(businessId: string): boolean {
  return (
    mobileNativeBookingsEnabled(businessId) || desktopNativeBookingsEnabled(businessId)
  );
}

async function withDeveloperAccess<T extends { ok: true; context: { businessId: string } }>(
  result: T,
): Promise<T> {
  await grantDeveloperFullAccessForBusiness(result.context.businessId);
  return result;
}

export async function requireMobileRead(req: NextRequest) {
  const keyResult = await requireAnyApiKey(req, [...DEVICE_READ_SCOPES]);
  if (!keyResult.ok) return keyResult;
  if (!deviceModulesEnabled(keyResult.context.businessId)) {
    return { ok: false as const, response: featureDisabledResponse() };
  }
  return withDeveloperAccess(keyResult);
}

export async function requireMobileBookings(req: NextRequest) {
  const keyResult = await requireAnyApiKey(req, [...DEVICE_BOOKINGS_SCOPES]);
  if (!keyResult.ok) return keyResult;
  if (!deviceModulesEnabled(keyResult.context.businessId)) {
    return { ok: false as const, response: featureDisabledResponse() };
  }
  return withDeveloperAccess(keyResult);
}

export async function requireMobileWrite(req: NextRequest) {
  const keyResult = await requireAnyApiKey(req, [...DEVICE_WRITE_SCOPES]);
  if (!keyResult.ok) return keyResult;
  if (!deviceModulesEnabled(keyResult.context.businessId)) {
    return { ok: false as const, response: featureDisabledResponse() };
  }
  return withDeveloperAccess(keyResult);
}
