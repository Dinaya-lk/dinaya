import { GET as desktopGET, PATCH as desktopPATCH } from "@/app/api/v1/desktop/deals/[id]/route";

/** Mobile alias — reuses the desktop deal detail handler. */
export const GET = desktopGET;
export const PATCH = desktopPATCH;
