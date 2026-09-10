import { POST as desktopPOST } from "@/app/api/v1/desktop/auth/logout/route";

/** Mobile alias — reuses the desktop logout handler (revokes the bearer key). */
export const POST = desktopPOST;
