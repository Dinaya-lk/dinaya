import { GET as desktopGET } from "@/app/api/v1/desktop/calendar/route";

/** Mobile alias — reuses the desktop calendar handler. */
export const GET = desktopGET;
