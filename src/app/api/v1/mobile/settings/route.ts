import { GET as desktopGET, PATCH as desktopPATCH } from "@/app/api/v1/desktop/settings/route";

/** Mobile alias — reuses the desktop settings handler. */
export const GET = desktopGET;
export const PATCH = desktopPATCH;
