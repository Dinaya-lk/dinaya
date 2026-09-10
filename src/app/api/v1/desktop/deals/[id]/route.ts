import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireDesktopRead, requireDesktopWrite } from "@/app/api/v1/desktop/_shared";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { logActivity } from "@/lib/activity-log";
import { getDealDashboardDetail } from "@/lib/dashboard/deals";
import type { DealRow } from "@/lib/deals/validation";
import { PlanRequiredError, requirePro } from "@/lib/plan";
import { withRateLimit } from "@/lib/rate-limit";
import { z } from "@/lib/validation";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  status: z.enum(["active", "cancelled"]).optional(),
}).refine(
  (data) => data.isActive !== undefined || data.status !== undefined,
  { message: "Provide isActive or status." },
);

type DealStatus = DealRow["status"];

function resolveDealToggleAction(
  isActive: boolean | undefined,
  status: "active" | "cancelled" | undefined,
): "activate" | "cancel" | "conflict" {
  const fromFlag = isActive === undefined ? null : isActive ? "activate" as const : "cancel" as const;
  const fromStatus = status === undefined ? null : status === "active" ? "activate" as const : "cancel" as const;
  if (fromFlag && fromStatus && fromFlag !== fromStatus) return "conflict";
  return fromFlag ?? fromStatus ?? "conflict";
}

function nextDealStatusForToggle(
  current: DealStatus,
  action: "activate" | "cancel",
): { ok: true; status: "active" | "cancelled"; noop?: boolean } | { ok: false; error: string } {
  if (action === "cancel") {
    switch (current) {
      case "cancelled":
        return { ok: false, error: "Deal is already cancelled." };
      case "active":
      case "expired":
      case "sold_out":
        return { ok: true, status: "cancelled" };
      default: {
        const _never: never = current;
        return { ok: false, error: `Unhandled deal status: ${_never}` };
      }
    }
  }

  switch (current) {
    case "cancelled":
      return { ok: true, status: "active" };
    case "active":
      return { ok: true, status: "active", noop: true };
    case "expired":
      return { ok: false, error: "Expired deals cannot be reactivated." };
    case "sold_out":
      return { ok: false, error: "Sold-out deals cannot be reactivated." };
    default: {
      const _never: never = current;
      return { ok: false, error: `Unhandled deal status: ${_never}` };
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDesktopRead(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;
  const { id } = await params;

  const limited = await withRateLimit(req, {
    scope: "desktop-deal-detail",
    limit: 240,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  try {
    await requirePro(businessId, "deals");
  } catch (error) {
    if (error instanceof PlanRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    throw error;
  }

  const detail = await getDealDashboardDetail(businessId, id);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    ...detail,
    serverTime: new Date().toISOString(),
    webUrl: "/dashboard/deals",
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDesktopWrite(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;
  const { id } = await params;

  const limited = await withRateLimit(req, {
    scope: "desktop-deal-update",
    limit: 90,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  try {
    await requirePro(businessId, "deals");
  } catch (error) {
    if (error instanceof PlanRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    throw error;
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid deal update." }, { status: 400 });
  }

  const action = resolveDealToggleAction(parsed.data.isActive, parsed.data.status);
  if (action === "conflict") {
    return NextResponse.json({ error: "isActive and status conflict." }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: deals.id, status: deals.status })
    .from(deals)
    .where(and(eq(deals.id, id), eq(deals.businessId, businessId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const next = nextDealStatusForToggle(existing.status, action);
  if (!next.ok) {
    return NextResponse.json({ error: next.error }, { status: 400 });
  }

  if (!next.noop) {
    await db
      .update(deals)
      .set({ status: next.status })
      .where(and(eq(deals.id, id), eq(deals.businessId, businessId)));

    void logActivity({
      action: next.status === "cancelled" ? "cancelled" : "updated",
      businessId,
      entity: "deal",
      entityId: id,
    }).catch((error) => {
      console.error("Activity log write failed:", error);
    });
  }

  const detail = await getDealDashboardDetail(businessId, id);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    ...detail,
    serverTime: new Date().toISOString(),
    webUrl: "/dashboard/deals",
  });
}
