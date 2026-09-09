import { NextRequest, NextResponse } from "next/server";
import { requireDesktopRead } from "@/app/api/v1/desktop/_shared";
import { getReportsDashboardOverview, normalizeReportsRange } from "@/lib/dashboard/reports";
import { PlanRequiredError, requirePro } from "@/lib/plan";
import { withRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const authResult = await requireDesktopRead(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const { searchParams } = new URL(req.url);
  const range = normalizeReportsRange({
    from: searchParams.get("from"),
    preset: searchParams.get("range"),
    to: searchParams.get("to"),
  });

  const limited = await withRateLimit(req, {
    scope: "desktop-reports",
    limit: 120,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  try {
    await requirePro(businessId, "reports");
  } catch (error) {
    if (error instanceof PlanRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    throw error;
  }

  const reports = await getReportsDashboardOverview(businessId, range);
  return NextResponse.json({
    ...reports,
    serverTime: new Date().toISOString(),
    webUrl: "/dashboard/reports",
  });
}
