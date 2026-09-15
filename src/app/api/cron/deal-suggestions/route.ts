import { NextRequest, NextResponse } from "next/server";
import { generateDealSuggestions } from "@/lib/deals/suggestions";
import { expirePastDeals } from "@/lib/deals/queries";
import { getCronSecret } from "@/lib/env";

export async function GET(req: NextRequest) {
  const expected = getCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
  }

  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [summary, expiredDeals] = await Promise.all([
      generateDealSuggestions(),
      expirePastDeals(),
    ]);
    return NextResponse.json({ ok: true, summary, expiredDeals });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/deal-suggestions] unhandled error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
