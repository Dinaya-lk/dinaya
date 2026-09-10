import { GET as desktopGET, PATCH as desktopPATCH } from "@/app/api/v1/desktop/locations/[id]/route";

/** Mobile alias — reuses the desktop location detail handler. */
export const GET = desktopGET;
export const PATCH = desktopPATCH;
