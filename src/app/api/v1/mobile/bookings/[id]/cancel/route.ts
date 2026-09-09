import { POST as desktopPOST } from "@/app/api/v1/desktop/bookings/[id]/cancel/route";

/** Mobile alias — reuses the desktop booking cancel handler. */
export const POST = desktopPOST;
