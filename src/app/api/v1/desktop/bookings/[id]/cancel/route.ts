import { NextRequest, NextResponse } from "next/server";
import { requireDesktopWrite } from "@/app/api/v1/desktop/_shared";
import {
  cancelDeviceBooking,
  deviceBookingCancelSchema,
} from "@/lib/dashboard/device-bookings";
import { deviceRateLimitSuffix } from "@/lib/device-client";
import { withRateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDesktopWrite(req);
  if (!authResult.ok) return authResult.response;
  const { businessId, deviceId, keyType } = authResult.context;
  const { id } = await params;

  const limited = await withRateLimit(req, {
    scope: "desktop-booking-cancel",
    limit: 120,
    windowSeconds: 60,
  }, { keySuffix: deviceRateLimitSuffix(req, businessId, deviceId) });
  if (!limited.ok) return limited.response;

  const parsed = deviceBookingCancelSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the cancellation details." }, { status: 400 });
  }

  const result = await cancelDeviceBooking(
    businessId,
    id,
    parsed.data.reason,
    { channel: keyType === "mobile" ? "mobile" : "desktop" },
  );

  switch (result.status) {
    case "cancelled":
      return NextResponse.json(result.booking);
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
