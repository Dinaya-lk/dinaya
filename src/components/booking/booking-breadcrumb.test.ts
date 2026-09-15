import { describe, expect, it } from "vitest";
import { getBookingCopy } from "@/lib/i18n";
import { buildBookingBreadcrumbItems } from "./booking-breadcrumb";
import type { BookingService } from "./BookingWizard";

const copy = getBookingCopy("en");

const service = {
  id: "svc-1",
  name: "Haircut",
  durationMinutes: 30,
  priceLkr: 1500,
} as BookingService;

const base = {
  copy,
  service,
  hubHref: "/book/test",
  lockServiceSelection: true,
  multiService: true,
  needsStaffPicker: false,
  showStaffStep: false,
  onBackToServices: () => {},
  onBackToStaff: () => {},
  onBackToDateTime: () => {},
};

describe("buildBookingBreadcrumbItems", () => {
  it("shows All services / service / Date & Time when picking a time from the hub", () => {
    const items = buildBookingBreadcrumbItems({
      ...base,
      showContactForm: false,
    });

    expect(items).toEqual([
      { label: "All services", href: "/book/test" },
      { label: "Haircut" },
      { label: "Date & Time", current: true },
    ]);
  });

  it("shows full staff trail on the contact step when multiple staff exist", () => {
    const items = buildBookingBreadcrumbItems({
      ...base,
      lockServiceSelection: false,
      showContactForm: true,
      needsStaffPicker: true,
    });

    expect(items).toEqual([
      { label: "All services", href: "/book/test" },
      { label: "Haircut", onClick: expect.any(Function) },
      { label: "Choose a team member", onClick: expect.any(Function) },
      { label: "Date & Time", onClick: expect.any(Function) },
      { label: "Your details", current: true },
    ]);
  });

  it("shows All services / Date & time / Your details on the contact step", () => {
    const items = buildBookingBreadcrumbItems({
      ...base,
      showContactForm: true,
    });

    expect(items).toEqual([
      { label: "All services", href: "/book/test" },
      { label: "Date & Time", onClick: expect.any(Function) },
      { label: "Your details", current: true },
    ]);
  });

  it("shows staff step crumbs when choosing a team member", () => {
    const items = buildBookingBreadcrumbItems({
      ...base,
      lockServiceSelection: false,
      showContactForm: false,
      needsStaffPicker: true,
      showStaffStep: true,
    });

    expect(items).toEqual([
      { label: "All services", href: "/book/test" },
      { label: "Haircut", onClick: expect.any(Function) },
      { label: "Choose a team member", current: true },
    ]);
  });

  it("shows stylist step before date and time when staff is required", () => {
    const items = buildBookingBreadcrumbItems({
      ...base,
      lockServiceSelection: false,
      showContactForm: false,
      needsStaffPicker: true,
      showStaffStep: false,
    });

    expect(items).toEqual([
      { label: "All services", href: "/book/test" },
      { label: "Haircut", onClick: expect.any(Function) },
      { label: "Choose a team member", onClick: expect.any(Function) },
      { label: "Date & Time", current: true },
    ]);
  });

  it("uses Choose a service when there is no hub link", () => {
    const items = buildBookingBreadcrumbItems({
      ...base,
      showContactForm: false,
      hubHref: null,
      lockServiceSelection: false,
    });

    expect(items[0]).toEqual({ label: "Choose a service", onClick: expect.any(Function) });
    expect(items[1]).toEqual({ label: "Haircut", onClick: expect.any(Function) });
    expect(items[2]).toEqual({ label: "Date & Time", current: true });
  });

  it("uses onBackToHub click when provided", () => {
    const items = buildBookingBreadcrumbItems({
      ...base,
      hubHref: "/book/test",
      onBackToHub: () => undefined,
      showContactForm: false,
      showStaffStep: false,
      needsStaffPicker: false,
    });
    expect(items[0]).toEqual({ label: "All services", onClick: expect.any(Function) });
  });
});
