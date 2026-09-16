import type { Staff } from "@/db/schema";

/** Query param value for merged availability across eligible staff. */
export const ANY_STAFF_ID = "__any__";

export function isAnyStaffId(staffId: string | null | undefined): boolean {
  return staffId === ANY_STAFF_ID;
}

export function getEligibleStaff(
  allStaff: Staff[],
  staffServiceMap: { staffId: string; serviceId: string }[],
  serviceId: string,
  staffLocationMap?: { staffId: string; locationId: string }[],
  locationId?: string | null
): Staff[] {
  const eligibleIds = new Set(
    staffServiceMap.filter((m) => m.serviceId === serviceId).map((m) => m.staffId)
  );
  let result = allStaff.filter((s) => eligibleIds.has(s.id));

  if (locationId && staffLocationMap && staffLocationMap.length > 0) {
    const atLocation = new Set(
      staffLocationMap.filter((m) => m.locationId === locationId).map((m) => m.staffId)
    );
    // Always filter — empty set means no staff at this branch, not "show everyone"
    result = result.filter((s) => atLocation.has(s.id));
  }

  return result;
}

/** Auto-select when only one person can perform the service. */
export function pickDefaultStaff(
  allStaff: Staff[],
  staffServiceMap: { staffId: string; serviceId: string }[],
  serviceId: string,
  staffLocationMap?: { staffId: string; locationId: string }[],
  locationId?: string | null
): Staff | null {
  const eligible = getEligibleStaff(
    allStaff,
    staffServiceMap,
    serviceId,
    staffLocationMap,
    locationId
  );
  return eligible.length === 1 ? eligible[0]! : null;
}

/** Pick staff + any-staff flag when entering a service. Auto-picks the sole eligible
 *  staff member; otherwise leaves the choice unset so the team-member picker shows. */
export function resolveBookingStaffSelection(
  allStaff: Staff[],
  staffServiceMap: { staffId: string; serviceId: string }[],
  serviceId: string,
  staffLocationMap?: { staffId: string; locationId: string }[],
  locationId?: string | null,
): { staff: Staff | null; anyStaff: boolean; eligibleCount: number } {
  const eligible = getEligibleStaff(
    allStaff,
    staffServiceMap,
    serviceId,
    staffLocationMap,
    locationId,
  );
  const staff = pickDefaultStaff(
    allStaff,
    staffServiceMap,
    serviceId,
    staffLocationMap,
    locationId,
  );
  return {
    staff,
    anyStaff: false,
    eligibleCount: eligible.length,
  };
}
