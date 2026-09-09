import { NextRequest, NextResponse } from "next/server";
import { RegisterAccountError, registerBusinessAccount } from "@/lib/auth/register-business-account";
import { createDesktopAuthSession, DesktopAuthError } from "@/lib/desktop-auth-session";
import { anonymousDeviceRateLimitSuffix, resolveDeviceClient } from "@/lib/device-client";
import { withRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/schemas/register";
import { z } from "@/lib/validation";

const desktopRegisterSchema = registerSchema.extend({
  deviceName: z.string().trim().min(1).max(120).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await withRateLimit(req, {
    scope: "register",
    limit: 5,
    windowSeconds: 60 * 15,
  }, { keySuffix: anonymousDeviceRateLimitSuffix(req) });
  if (!limited.ok) return limited.response;

  const parsed = desktopRegisterSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your registration details.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { deviceName, ...registerInput } = parsed.data;
  const client = resolveDeviceClient(req, "desktop");

  try {
    await registerBusinessAccount(registerInput);
    const session = await createDesktopAuthSession({
      deviceName: deviceName ?? (client === "mobile" ? "Dinaya Android" : "Dinaya Desktop"),
      email: registerInput.email,
      password: registerInput.password,
      client,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    if (error instanceof RegisterAccountError || error instanceof DesktopAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
