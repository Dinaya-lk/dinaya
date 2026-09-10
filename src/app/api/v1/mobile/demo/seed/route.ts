import { NextRequest, NextResponse } from "next/server";
import { requireMobileWrite } from "@/app/api/v1/mobile/_shared";
import { seedFounderDemoCatalog } from "@/lib/founder-demo-seed";

export async function POST(req: NextRequest) {
  const auth = await requireMobileWrite(req);
  if (!auth.ok) return auth.response;

  const result = await seedFounderDemoCatalog(auth.context.businessId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    created: result.created,
    message: "Demo salon data is ready. Open Home, Bookings, Calendar, and More to try each screen.",
  });
}
