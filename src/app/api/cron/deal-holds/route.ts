import { NextRequest, NextResponse } from "next/server";
import { releaseStaleDealHolds } from "@/lib/deals/holds";
import { getCronSecret } from "@/lib/env";

export async function GET(req: NextRequest) {
  const expected = getCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await releaseStaleDealHolds();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/deal-holds] unhandled error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
