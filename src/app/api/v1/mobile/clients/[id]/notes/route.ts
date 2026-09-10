import { POST as desktopPOST } from "@/app/api/v1/desktop/clients/[id]/notes/route";

/** Mobile alias — reuses the desktop client-notes handler. */
export const POST = desktopPOST;
