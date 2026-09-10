import { GET as desktopGET } from "@/app/api/v1/desktop/bootstrap/route";

/** Mobile alias — reuses the desktop bootstrap handler. */
export const GET = desktopGET;
