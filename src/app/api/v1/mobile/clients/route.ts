import { GET as desktopGET, POST as desktopPOST } from "@/app/api/v1/desktop/clients/route";

/** Mobile alias — reuses the desktop clients handler. */
export const GET = desktopGET;
export const POST = desktopPOST;
