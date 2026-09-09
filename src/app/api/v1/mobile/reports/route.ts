import { GET as desktopGET } from "@/app/api/v1/desktop/reports/route";

/** Mobile alias — reuses the desktop reports handler. */
export const GET = desktopGET;
