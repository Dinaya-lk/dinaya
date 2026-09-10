import { GET as desktopGET, PATCH as desktopPATCH } from "@/app/api/v1/desktop/automations/[id]/route";

/** Mobile alias — reuses the desktop automation detail handler. */
export const GET = desktopGET;
export const PATCH = desktopPATCH;
