import { GET as desktopGET, PATCH as desktopPATCH } from "@/app/api/v1/desktop/bookings/[id]/route";

/** Mobile alias — reuses the desktop booking detail handlers. */
export const GET = desktopGET;
export const PATCH = desktopPATCH;
