import { GET as desktopGET, PATCH as desktopPATCH } from "@/app/api/v1/desktop/clients/[id]/route";

/** Mobile alias — reuses the desktop client detail handler. */
export const GET = desktopGET;
export const PATCH = desktopPATCH;
