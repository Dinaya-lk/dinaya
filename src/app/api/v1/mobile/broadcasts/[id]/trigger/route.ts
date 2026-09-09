import { POST as desktopPOST } from "@/app/api/v1/desktop/broadcasts/[id]/trigger/route";

/** Mobile alias — reuses the desktop broadcast trigger handler. */
export const POST = desktopPOST;
