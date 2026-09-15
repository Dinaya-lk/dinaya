import { NextRequest, NextResponse } from "next/server";
import { requireDesktopRead } from "@/app/api/v1/desktop/_shared";
import {
  getReviewsDashboardList,
  isDashboardReviewStatusFilter,
  type DashboardReviewStatusFilter,
} from "@/lib/dashboard/reviews";
import { PlanRequiredError, requirePro } from "@/lib/plan";
import { withRateLimit } from "@/lib/rate-limit";

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 150;

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(parsed)));
}

function parseRating(value: string | null): number | null {
  if (!value || value === "all") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return Number.NaN;
  return parsed;
}

export async function GET(req: NextRequest) {
  const authResult = await requireDesktopRead(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId } = authResult.context;

  try {
    await requirePro(businessId, "reviews");
  } catch (error) {
    if (error instanceof PlanRequiredError) {
      return NextResponse.json(
        { error: error.message, feature: "reviews" },
        { status: 402 },
      );
    }
    throw error;
  }

  const limited = await withRateLimit(req, {
    scope: "desktop-reviews",
    limit: 180,
    windowSeconds: 60,
  }, { keySuffix: `${businessId}:${deviceId ?? "unknown"}` });
  if (!limited.ok) return limited.response;

  const params = req.nextUrl.searchParams;
  const statusParam = params.get("status");
  if (statusParam && !isDashboardReviewStatusFilter(statusParam)) {
    return NextResponse.json({ error: "status is invalid." }, { status: 400 });
  }

  const rating = parseRating(params.get("rating"));
  if (Number.isNaN(rating)) {
    return NextResponse.json({ error: "rating is invalid." }, { status: 400 });
  }

  const reviews = await getReviewsDashboardList(businessId, {
    limit: parseLimit(params.get("limit")),
    q: params.get("q")?.trim() ?? "",
    rating,
    status: (statusParam || "all") as DashboardReviewStatusFilter,
  });

  return NextResponse.json({
    ...reviews,
    serverTime: new Date().toISOString(),
    webUrl: "/dashboard/reviews",
  });
}
