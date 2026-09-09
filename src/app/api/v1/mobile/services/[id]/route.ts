import { GET as desktopGET, PATCH as desktopPATCH } from "@/app/api/v1/desktop/services/[id]/route";

/** Mobile alias — reuses the desktop service detail handler. */
export const GET = desktopGET;
export const PATCH = desktopPATCH;
