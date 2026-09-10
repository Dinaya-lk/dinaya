import { GET as desktopGET, POST as desktopPOST } from "@/app/api/v1/desktop/services/route";

/** Mobile alias — reuses the desktop services handler. */
export const GET = desktopGET;
export const POST = desktopPOST;
