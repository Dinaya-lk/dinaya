import { POST as desktopPOST } from "@/app/api/v1/desktop/ai/content/route";

/** Mobile alias — reuses the desktop AI content generate handler. */
export const POST = desktopPOST;
