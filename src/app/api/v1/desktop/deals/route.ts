import { NextRequest, NextResponse } from "next/server";
import { requireDesktopRead, requireDesktopWrite } from "@/app/api/v1/desktop/_shared";
import {
  getDealsDashboardList,
  isDashboardDealStatusFilter,
  type DashboardDealStatusFilter,
} from "@/lib/dashboard/deals";
import { createDeviceDeal } from "@/lib/dashboard/device-deals";
import { PlanRequiredError, requirePro } from "@/lib/plan";
import { withRateLimit } from "@/lib/rate-limit";

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 150;

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(parsed)));
}

export async function GET(req: NextRequest) {
  const authResult = await requireDesktopRead(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-deals",
    limit: 180,
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

  const params = req.nextUrl.searchParams;
  const statusParam = params.get("status");
  if (statusParam && !isDashboardDealStatusFilter(statusParam)) {
    return NextResponse.json({ error: "status is invalid." }, { status: 400 });
  }

  const deals = await getDealsDashboardList(businessId, {
    limit: parseLimit(params.get("limit")),
    q: params.get("q")?.trim() ?? "",
    status: (statusParam || "all") as DashboardDealStatusFilter,
  });

  return NextResponse.json({
    ...deals,
    serverTime: new Date().toISOString(),
    webUrl: "/dashboard/deals",
  });
}

function isNotifyClientsRequested(body: unknown): boolean {
  return Boolean(
    body
    && typeof body === "object"
    && "notifyClients" in body
    && (body as { notifyClients?: unknown }).notifyClients === true,
  );
}

export async function POST(req: NextRequest) {
  const authResult = await requireDesktopWrite(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  const limited = await withRateLimit(req, {
    scope: "desktop-deal-create",
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

  const body = await req.json().catch(() => null);
  if (isNotifyClientsRequested(body)) {
    try {
      await requirePro(businessId, "whatsappSms");
    } catch (error) {
      if (error instanceof PlanRequiredError) {
        return NextResponse.json(
          { error: "Notify clients requires WhatsApp/SMS on Pro or Max." },
          { status: 402 },
        );
      }
      throw error;
    }
  }

  const result = await createDeviceDeal(businessId, body);
  switch (result.status) {
    case "created":
      return NextResponse.json({
        ...result.deal,
        serverTime: new Date().toISOString(),
        webUrl: "/dashboard/deals",
      }, { status: 201 });
    case "invalid":
      return NextResponse.json({ error: result.error }, { status: 400 });
    case "not_found":
      return NextResponse.json({ error: result.error }, { status: 404 });
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}
