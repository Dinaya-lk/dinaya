import { GET as desktopGET, PATCH as desktopPATCH } from "@/app/api/v1/desktop/staff/[id]/route";

/** Mobile alias — reuses the desktop staff detail handler. */
export const GET = desktopGET;
export const PATCH = desktopPATCH;
