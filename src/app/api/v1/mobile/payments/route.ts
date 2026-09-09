import { GET as desktopGET } from "@/app/api/v1/desktop/payments/route";

/** Mobile alias — reuses the desktop payments list handler. */
export const GET = desktopGET;
