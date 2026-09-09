import { NextRequest, NextResponse } from "next/server";
import { requireAnyApiKey } from "@/lib/api-key-auth";
import {
  DEVICE_BOOKINGS_SCOPES,
  DEVICE_READ_SCOPES,
  DEVICE_WRITE_SCOPES,
} from "@/lib/device-client";
import { desktopNativeBookingsEnabled, mobileNativeBookingsEnabled } from "@/lib/desktop-native";

export type DesktopAuthContext = {
  businessId: string;
  keyId: string;
  keyType: string;
  deviceId: string | null;
  deviceName: string | null;
  scopes: string[];
};

function featureDisabledResponse() {
  return NextResponse.json(
    { error: "Desktop native modules are not enabled for this business." },
    { status: 403 },
  );
}

function deviceModulesEnabled(businessId: string): boolean {
  return (
    desktopNativeBookingsEnabled(businessId) || mobileNativeBookingsEnabled(businessId)
  );
}

export async function requireDesktopRead(req: NextRequest) {
  // Accept mobile scopes too so `mobile` keys keep working on desktop paths
  // (and vice versa) during the Android migration.
  const keyResult = await requireAnyApiKey(req, [...DEVICE_READ_SCOPES]);
  if (!keyResult.ok) return keyResult;
  if (!deviceModulesEnabled(keyResult.context.businessId)) {
    return { ok: false as const, response: featureDisabledResponse() };
  }
  return keyResult;
}

export async function requireDesktopBookings(req: NextRequest) {
  const keyResult = await requireAnyApiKey(req, [...DEVICE_BOOKINGS_SCOPES]);
  if (!keyResult.ok) return keyResult;
  if (!deviceModulesEnabled(keyResult.context.businessId)) {
    return { ok: false as const, response: featureDisabledResponse() };
  }
  return keyResult;
}

export async function requireDesktopWrite(req: NextRequest) {
  const keyResult = await requireAnyApiKey(req, [...DEVICE_WRITE_SCOPES]);
  if (!keyResult.ok) return keyResult;
  if (!deviceModulesEnabled(keyResult.context.businessId)) {
    return { ok: false as const, response: featureDisabledResponse() };
  }
  return keyResult;
}
