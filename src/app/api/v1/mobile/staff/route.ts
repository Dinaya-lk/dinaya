import { GET as desktopGET, POST as desktopPOST } from "@/app/api/v1/desktop/staff/route";

/** Mobile alias — reuses the desktop staff handler. */
export const GET = desktopGET;
export const POST = desktopPOST;
