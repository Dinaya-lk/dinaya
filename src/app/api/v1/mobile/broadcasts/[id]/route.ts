import { GET as desktopGET } from "@/app/api/v1/desktop/broadcasts/[id]/route";

/** Mobile alias — reuses the desktop broadcast detail handler. */
export const GET = desktopGET;
