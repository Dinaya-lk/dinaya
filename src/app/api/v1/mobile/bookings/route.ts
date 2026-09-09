import { GET as desktopGET, POST as desktopPOST } from "@/app/api/v1/desktop/bookings/route";

/** Mobile alias — reuses the desktop bookings handlers. */
export const GET = desktopGET;
export const POST = desktopPOST;
