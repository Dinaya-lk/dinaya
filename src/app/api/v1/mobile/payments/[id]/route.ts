import { GET as desktopGET } from "@/app/api/v1/desktop/payments/[id]/route";

/** Mobile alias — reuses the desktop payment detail handler. */
export const GET = desktopGET;
