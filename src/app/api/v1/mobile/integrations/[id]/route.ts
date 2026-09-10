import { GET as desktopGET } from "@/app/api/v1/desktop/integrations/[id]/route";

/** Mobile alias — reuses the desktop integration detail handler. */
export const GET = desktopGET;
