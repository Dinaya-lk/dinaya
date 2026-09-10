import { NextRequest, NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, locations, services, staff } from "@/db/schema";
import { requireDesktopRead } from "@/app/api/v1/desktop/_shared";
import { getDashboardOverviewData, serializeDashboardOverviewData } from "@/lib/dashboard/overview-data";
import { getEntitlements, type Plan } from "@/lib/plan";
import type { PlanUsage } from "@/lib/dashboard-usage";
import { deviceRateLimitSuffix } from "@/lib/device-client";
import { withRateLimit } from "@/lib/rate-limit";

function trialDaysLeftFrom(planExpiresAt: Date | null): number | null {
  if (!planExpiresAt) return null;
  return Math.max(0, Math.ceil((planExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

async function getPlanUsage(businessId: string, plan: Plan): Promise<PlanUsage> {
  const limits = getEntitlements(plan).limits;
  try {
    const [[{ servicesCount }], [{ staffCount }], [{ locationsCount }]] = await Promise.all([
      db.select({ servicesCount: count() }).from(services).where(eq(services.businessId, businessId)),
      db.select({ staffCount: count() }).from(staff).where(eq(staff.businessId, businessId)),
      db.select({ locationsCount: count() }).from(locations).where(eq(locations.businessId, businessId)),
    ]);
    return {
      services: { used: Number(servicesCount), limit: limits.services },
      staff: { used: Number(staffCount), limit: limits.staff },
      locations: { used: Number(locationsCount), limit: limits.locations },
    };
  } catch {
    return {
      services: { used: 0, limit: limits.services },
      staff: { used: 0, limit: limits.staff },
      locations: { used: 0, limit: limits.locations },
    };
  }
}

export async function GET(req: NextRequest) {
  const authResult = await requireDesktopRead(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(
    req,
    {
      scope: "desktop-overview",
      limit: 120,
      windowSeconds: 60,
    },
    { keySuffix: deviceRateLimitSuffix(req, businessId, deviceId) },
  );
  if (!limited.ok) return limited.response;

  const [business] = await db
    .select({
      language: businesses.language,
      plan: businesses.plan,
      planExpiresAt: businesses.planExpiresAt,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const data = await getDashboardOverviewData(businessId);
  if (!data) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const planUsage = await getPlanUsage(businessId, business.plan as Plan);
  const trialDaysLeft = business.plan === "trial" ? trialDaysLeftFrom(business.planExpiresAt) : null;

  return NextResponse.json({
    overview: serializeDashboardOverviewData(data),
    shell: {
      language: business.language ?? "en",
      planUsage,
      trialDaysLeft,
    },
    serverTime: new Date().toISOString(),
  });
}
