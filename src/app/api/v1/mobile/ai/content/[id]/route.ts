import { PATCH as desktopPATCH } from "@/app/api/v1/desktop/ai/content/[id]/route";

/** Mobile alias — reuses the desktop AI content update handler. */
export const PATCH = desktopPATCH;
