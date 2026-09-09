import { PATCH as desktopPATCH } from "@/app/api/v1/desktop/bookings/[id]/status/route";

/** Mobile alias — reuses the desktop booking-status handler. */
export const PATCH = desktopPATCH;
