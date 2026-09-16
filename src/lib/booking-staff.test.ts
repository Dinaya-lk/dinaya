import { describe, expect, it } from "vitest";
import { getEligibleStaff, resolveBookingStaffSelection } from "@/lib/booking-staff";
import type { Staff } from "@/db/schema";

const staff = [
  { id: "s1", name: "A" },
  { id: "s2", name: "B" },
] as Staff[];

const map = [
  { staffId: "s1", serviceId: "svc1" },
  { staffId: "s2", serviceId: "svc1" },
];

describe("resolveBookingStaffSelection", () => {
  it("leaves staff unset when multiple eligible so the picker shows", () => {
    const result = resolveBookingStaffSelection(staff, map, "svc1");
    expect(result.eligibleCount).toBe(2);
    expect(result.staff).toBeNull();
    expect(result.anyStaff).toBe(false);
  });

  it("picks the only eligible staff member", () => {
    const result = resolveBookingStaffSelection(staff, [{ staffId: "s1", serviceId: "svc1" }], "svc1");
    expect(result.eligibleCount).toBe(1);
    expect(result.staff?.id).toBe("s1");
    expect(result.anyStaff).toBe(false);
  });

  it("returns empty when no staff can perform the service", () => {
    const result = resolveBookingStaffSelection(staff, [], "svc1");
    expect(result.eligibleCount).toBe(0);
    expect(getEligibleStaff(staff, [], "svc1")).toHaveLength(0);
  });
});
