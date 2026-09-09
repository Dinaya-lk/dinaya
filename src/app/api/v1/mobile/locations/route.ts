import { GET as desktopGET, POST as desktopPOST } from "@/app/api/v1/desktop/locations/route";

/** Mobile alias — reuses the desktop locations handler. */
export const GET = desktopGET;
export const POST = desktopPOST;
