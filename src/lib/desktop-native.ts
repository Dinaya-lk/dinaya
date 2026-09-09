const DEFAULT_FLAG = true;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function desktopNativeBookingsEnabled(businessId: string): boolean {
  const configured = process.env.DESKTOP_NATIVE_BOOKINGS_BUSINESS_IDS;
  if (!configured) return DEFAULT_FLAG;

  const values = configured
    .split(",")
    .map(normalize)
    .filter(Boolean);

  if (values.includes("*")) return true;
  return values.includes(normalize(businessId));
}

/**
 * Mobile-native rollout flag. Falls back to the desktop allow-list so the
 * `/api/v1/mobile/*` aliases work everywhere desktop already works, while
 * still allowing a mobile-only override via
 * `MOBILE_NATIVE_BOOKINGS_BUSINESS_IDS`.
 */
export function mobileNativeBookingsEnabled(businessId: string): boolean {
  const configured = process.env.MOBILE_NATIVE_BOOKINGS_BUSINESS_IDS;
  if (configured) {
    const values = configured
      .split(",")
      .map(normalize)
      .filter(Boolean);

    if (values.includes("*")) return true;
    return values.includes(normalize(businessId));
  }

  return desktopNativeBookingsEnabled(businessId);
}
