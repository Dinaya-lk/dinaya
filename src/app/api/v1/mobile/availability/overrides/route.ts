import { POST as desktopPOST, DELETE as desktopDELETE } from "@/app/api/v1/desktop/availability/overrides/route";

/** Mobile alias — reuses the desktop availability-overrides handler. */
export const POST = desktopPOST;
export const DELETE = desktopDELETE;
