import { POST as desktopPOST } from "@/app/api/v1/desktop/ai/reactivate/route";

/** Mobile alias — reuses the desktop AI reactivation handler. */
export const POST = desktopPOST;
