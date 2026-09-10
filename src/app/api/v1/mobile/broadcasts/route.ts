import { NextRequest } from "next/server";
import { GET as desktopModuleGET } from "@/app/api/v1/desktop/[module]/route";
import { POST as desktopBroadcastsPOST } from "@/app/api/v1/desktop/broadcasts/route";

/** GET stays the Android module payload (`title` / `items` / `metrics`). POST reuses desktop create. */
export async function GET(req: NextRequest) {
  return desktopModuleGET(req, { params: Promise.resolve({ module: "broadcasts" }) });
}

export const POST = desktopBroadcastsPOST;
