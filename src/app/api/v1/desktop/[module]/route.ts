import { NextRequest, NextResponse } from "next/server";
import { requireDesktopRead } from "@/app/api/v1/desktop/_shared";
import { deviceRateLimitSuffix } from "@/lib/device-client";
import { withRateLimit } from "@/lib/rate-limit";
import {
  getDesktopModuleData,
  isDesktopModuleKey,
} from "@/lib/dashboard/desktop-modules";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ module: string }> },
) {
  const authResult = await requireDesktopRead(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;
  const { module } = await params;

  if (!isDesktopModuleKey(module)) {
    return NextResponse.json({ error: "Unknown desktop module." }, { status: 404 });
  }

  const limited = await withRateLimit(req, {
    scope: `desktop-module-${module}`,
    limit: 180,
    windowSeconds: 60,
  }, { keySuffix: deviceRateLimitSuffix(req, businessId, deviceId) });
  if (!limited.ok) return limited.response;

  const payload = await getDesktopModuleData(businessId, module);
  return NextResponse.json(payload);
}
