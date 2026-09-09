import type { NextRequest } from "next/server";
import { handleDeviceLogin } from "@/app/api/v1/desktop/auth/login/route";

/**
 * Mobile-native login. Issues `keyType: "mobile"` keys with
 * `mobile:read` / `mobile:bookings` / `mobile:write` scopes.
 * Response includes both `mobileKey` and `desktopKey` (same value) so older
 * Android builds reading `desktopKey` keep working.
 */
export async function POST(req: NextRequest) {
  return handleDeviceLogin(req, "mobile");
}
