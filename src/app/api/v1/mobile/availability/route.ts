import { GET as desktopGET, PATCH as desktopPATCH } from "@/app/api/v1/desktop/availability/route";

/** Mobile alias — reuses the desktop availability handler. */
export const GET = desktopGET;
export const PATCH = desktopPATCH;
