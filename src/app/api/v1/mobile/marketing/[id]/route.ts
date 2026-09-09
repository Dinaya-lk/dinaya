import { GET as desktopGET, PATCH as desktopPATCH } from "@/app/api/v1/desktop/marketing/[id]/route";

/** Mobile alias — reuses the desktop marketing detail handler. */
export const GET = desktopGET;
export const PATCH = desktopPATCH;
