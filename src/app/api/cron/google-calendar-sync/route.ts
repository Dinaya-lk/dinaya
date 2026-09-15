import { NextResponse } from "next/server";
import { syncGoogleCalendarBookings } from "@/lib/google-calendar-sync";
import { getCronSecret } from "@/lib/env";

export async function GET(req: Request) {
  const expected = getCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const synced = await syncGoogleCalendarBookings();
    return NextResponse.json({ ok: true, synced });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/google-calendar-sync] unhandled error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
