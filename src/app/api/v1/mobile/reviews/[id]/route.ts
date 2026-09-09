import { GET as desktopGET, PATCH as desktopPATCH } from "@/app/api/v1/desktop/reviews/[id]/route";

/** Mobile alias — reuses the desktop review detail handler. */
export const GET = desktopGET;
export const PATCH = desktopPATCH;
