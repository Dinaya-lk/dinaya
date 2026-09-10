import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, staff } from "@/db/schema";
import { deviceRateLimitSuffix } from "@/lib/device-client";
import { withRateLimit } from "@/lib/rate-limit";
import { requireDesktopRead } from "@/app/api/v1/desktop/_shared";

export async function GET(req: NextRequest) {
  const authResult = await requireDesktopRead(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId, deviceName } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-bootstrap",
    limit: 180,
    windowSeconds: 60,
  }, { keySuffix: deviceRateLimitSuffix(req, businessId, deviceId) });
  if (!limited.ok) return limited.response;

  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      timezone: businesses.timezone,
      plan: businesses.plan,
      customDomain: businesses.customDomain,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const staffRows = await db
    .select({
      id: staff.id,
      name: staff.name,
      isActive: staff.isActive,
    })
    .from(staff)
    .where(and(eq(staff.businessId, businessId), eq(staff.isActive, true)));

  return NextResponse.json({
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      timezone: business.timezone,
      plan: business.plan,
      customDomain: business.customDomain,
    },
    auth: {
      keyId: authResult.context.keyId,
      keyType: authResult.context.keyType,
      deviceId: deviceId,
      deviceName: deviceName,
    },
    staff: staffRows,
    featureFlags: {
      desktopNativeBookings: true,
    },
    serverTime: new Date().toISOString(),
  });
}
