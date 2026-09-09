import { GET as desktopGET } from "@/app/api/v1/desktop/bookings/route";

/** Mobile alias — reuses the desktop bookings handler. */
export const GET = desktopGET;
