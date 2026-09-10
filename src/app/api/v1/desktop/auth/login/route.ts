import { NextRequest, NextResponse } from "next/server";
import { createDesktopAuthSession, DesktopAuthError } from "@/lib/desktop-auth-session";
import {
  anonymousDeviceRateLimitSuffix,
  resolveDeviceClient,
  type DeviceClient,
} from "@/lib/device-client";
import { withRateLimit } from "@/lib/rate-limit";
import { z } from "@/lib/validation";

export const loginSchema = z.object({
  deviceName: z.string().trim().min(1).max(120).optional(),
  email: z.email(),
  password: z.string().min(1).max(128),
});

/**
 * Shared device login handler. Desktop routes default to a `desktop` key;
 * the mobile alias defaults to `mobile`. `X-Dinaya-Mobile` always wins when
 * present so Android logins via either path get `keyType: "mobile"`.
 */
export async function handleDeviceLogin(req: NextRequest, defaultClient: DeviceClient) {
  const limited = await withRateLimit(req, {
    scope: "desktop-auth-login",
    limit: 20,
    windowSeconds: 60,
  }, { keySuffix: anonymousDeviceRateLimitSuffix(req) });
  if (!limited.ok) return limited.response;

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your login details." }, { status: 400 });
  }

  const client = resolveDeviceClient(req, defaultClient);

  try {
    const session = await createDesktopAuthSession({
      deviceName: parsed.data.deviceName ?? (client === "mobile" ? "Dinaya Android" : "Dinaya Desktop"),
      email: parsed.data.email,
      password: parsed.data.password,
      client,
    });
    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof DesktopAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  return handleDeviceLogin(req, "desktop");
}
