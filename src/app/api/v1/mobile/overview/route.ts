import { GET as desktopGET } from "@/app/api/v1/desktop/overview/route";

/** Mobile alias — reuses the desktop overview handler. */
export const GET = desktopGET;
