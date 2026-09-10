import { GET as desktopGET } from "@/app/api/v1/desktop/[module]/route";

/** Mobile alias — reuses the generic desktop module handler. */
export const GET = desktopGET;
