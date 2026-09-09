import { POST as desktopPOST } from "@/app/api/v1/desktop/broadcasts/[id]/send-test/route";

/** Mobile alias — reuses the desktop broadcast send-test handler. */
export const POST = desktopPOST;
