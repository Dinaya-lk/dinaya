import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: vi.fn(async () => undefined),
}));

import { GET as desktopClientsGET, POST as desktopClientsPOST } from "@/app/api/v1/desktop/clients/route";
import { GET as mobileClientsGET, POST as mobileClientsPOST } from "@/app/api/v1/mobile/clients/route";
import { GET as desktopClientDetailGET, PATCH as desktopClientDetailPATCH } from "@/app/api/v1/desktop/clients/[id]/route";
import { GET as mobileClientDetailGET, PATCH as mobileClientDetailPATCH } from "@/app/api/v1/mobile/clients/[id]/route";
import { POST as desktopClientNotesPOST } from "@/app/api/v1/desktop/clients/[id]/notes/route";
import { POST as mobileClientNotesPOST } from "@/app/api/v1/mobile/clients/[id]/notes/route";
import { GET as desktopServicesGET, POST as desktopServicesPOST } from "@/app/api/v1/desktop/services/route";
import { GET as mobileServicesGET, POST as mobileServicesPOST } from "@/app/api/v1/mobile/services/route";
import { GET as desktopServiceDetailGET, PATCH as desktopServiceDetailPATCH } from "@/app/api/v1/desktop/services/[id]/route";
import { GET as mobileServiceDetailGET, PATCH as mobileServiceDetailPATCH } from "@/app/api/v1/mobile/services/[id]/route";
import { GET as desktopStaffGET, POST as desktopStaffPOST } from "@/app/api/v1/desktop/staff/route";
import { GET as mobileStaffGET, POST as mobileStaffPOST } from "@/app/api/v1/mobile/staff/route";
import { GET as desktopStaffDetailGET, PATCH as desktopStaffDetailPATCH } from "@/app/api/v1/desktop/staff/[id]/route";
import { GET as mobileStaffDetailGET, PATCH as mobileStaffDetailPATCH } from "@/app/api/v1/mobile/staff/[id]/route";
import { GET as desktopLocationsGET, POST as desktopLocationsPOST } from "@/app/api/v1/desktop/locations/route";
import { GET as mobileLocationsGET, POST as mobileLocationsPOST } from "@/app/api/v1/mobile/locations/route";
import { GET as desktopLocationDetailGET, PATCH as desktopLocationDetailPATCH } from "@/app/api/v1/desktop/locations/[id]/route";
import { GET as mobileLocationDetailGET, PATCH as mobileLocationDetailPATCH } from "@/app/api/v1/mobile/locations/[id]/route";
import { GET as desktopAvailabilityGET, PATCH as desktopAvailabilityPATCH } from "@/app/api/v1/desktop/availability/route";
import { GET as mobileAvailabilityGET, PATCH as mobileAvailabilityPATCH } from "@/app/api/v1/mobile/availability/route";
import { POST as desktopAvailabilityOverridePOST, DELETE as desktopAvailabilityOverrideDELETE } from "@/app/api/v1/desktop/availability/overrides/route";
import { POST as mobileAvailabilityOverridePOST, DELETE as mobileAvailabilityOverrideDELETE } from "@/app/api/v1/mobile/availability/overrides/route";

describe("mobile catalog route aliases", () => {
  it("aliases clients list without duplicating logic", () => {
    expect(mobileClientsGET).toBe(desktopClientsGET);
    expect(mobileClientsPOST).toBe(desktopClientsPOST);
  });

  it("aliases client detail without duplicating logic", () => {
    expect(mobileClientDetailGET).toBe(desktopClientDetailGET);
    expect(mobileClientDetailPATCH).toBe(desktopClientDetailPATCH);
  });

  it("aliases client notes without duplicating logic", () => {
    expect(mobileClientNotesPOST).toBe(desktopClientNotesPOST);
  });

  it("aliases services list without duplicating logic", () => {
    expect(mobileServicesGET).toBe(desktopServicesGET);
    expect(mobileServicesPOST).toBe(desktopServicesPOST);
  });

  it("aliases service detail without duplicating logic", () => {
    expect(mobileServiceDetailGET).toBe(desktopServiceDetailGET);
    expect(mobileServiceDetailPATCH).toBe(desktopServiceDetailPATCH);
  });

  it("aliases staff list without duplicating logic", () => {
    expect(mobileStaffGET).toBe(desktopStaffGET);
    expect(mobileStaffPOST).toBe(desktopStaffPOST);
  });

  it("aliases staff detail without duplicating logic", () => {
    expect(mobileStaffDetailGET).toBe(desktopStaffDetailGET);
    expect(mobileStaffDetailPATCH).toBe(desktopStaffDetailPATCH);
  });

  it("aliases locations list without duplicating logic", () => {
    expect(mobileLocationsGET).toBe(desktopLocationsGET);
    expect(mobileLocationsPOST).toBe(desktopLocationsPOST);
  });

  it("aliases location detail without duplicating logic", () => {
    expect(mobileLocationDetailGET).toBe(desktopLocationDetailGET);
    expect(mobileLocationDetailPATCH).toBe(desktopLocationDetailPATCH);
  });

  it("aliases availability without duplicating logic", () => {
    expect(mobileAvailabilityGET).toBe(desktopAvailabilityGET);
    expect(mobileAvailabilityPATCH).toBe(desktopAvailabilityPATCH);
  });

  it("aliases availability overrides without duplicating logic", () => {
    expect(mobileAvailabilityOverridePOST).toBe(desktopAvailabilityOverridePOST);
    expect(mobileAvailabilityOverrideDELETE).toBe(desktopAvailabilityOverrideDELETE);
  });
});
