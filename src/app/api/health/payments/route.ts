import { NextRequest, NextResponse } from "next/server";
import { checkPaymentsHealth } from "@/lib/platform-health";
import { requireHealthAuth } from "@/lib/health-auth";

/** Node runtime: checkPaymentsHealth shares `@/lib/platform-health` with the DB probe, which imports `node:dns`. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authError = requireHealthAuth(req);
  if (authError) return authError;
  const startedAt = Date.now();

  const check = await checkPaymentsHealth();
  const ok = check.status === "up";
  const upstreamStatus =
    typeof check.details?.upstreamStatus === "number"
      ? check.details.upstreamStatus
      : null;
  const mode =
    check.details?.mode === "sandbox" || check.details?.mode === "production"
      ? check.details.mode
      : process.env.PAYHERE_SANDBOX === "true"
        ? "sandbox"
        : "production";

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      service: "payments",
      provider: check.provider ?? "payhere",
      mode,
      upstreamStatus,
      latencyMs: check.latencyMs,
      error: check.error ?? null,
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
