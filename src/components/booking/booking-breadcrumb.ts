import type { BookingCopy } from "@/lib/i18n";
import type { BookingBreadcrumbItem } from "./BookingBreadcrumb";
import type { BookingService } from "./BookingWizard";

type BuildBookingBreadcrumbInput = {
  copy: BookingCopy;
  service: BookingService;
  showContactForm: boolean;
  showStaffStep: boolean;
  needsStaffPicker: boolean;
  showVariantStep?: boolean;
  needsVariantPicker?: boolean;
  hubHref?: string | null;
  onBackToHub?: () => void;
  lockServiceSelection: boolean;
  multiService: boolean;
  onBackToServices: () => void;
  onBackToVariant?: () => void;
  onBackToStaff: () => void;
  onBackToDateTime: () => void;
};

export function buildBookingBreadcrumbItems({
  copy,
  service,
  showContactForm,
  showStaffStep,
  needsStaffPicker,
  showVariantStep = false,
  needsVariantPicker = false,
  hubHref,
  onBackToHub,
  lockServiceSelection,
  multiService,
  onBackToServices,
  onBackToVariant = () => {},
  onBackToStaff,
  onBackToDateTime,
}: BuildBookingBreadcrumbInput): BookingBreadcrumbItem[] {
  const items: BookingBreadcrumbItem[] = [];

  if (onBackToHub) {
    items.push({ label: copy.allServices, onClick: onBackToHub });
  } else if (hubHref) {
    items.push({ label: copy.allServices, href: hubHref });
  } else if (!lockServiceSelection && multiService) {
    items.push({ label: copy.chooseService, onClick: onBackToServices });
  }

  if (showVariantStep) {
    items.push({ label: service.name, onClick: lockServiceSelection ? undefined : onBackToServices });
    items.push({ label: copy.chooseOption, current: true });
    return items;
  }

  if (showContactForm) {
    if (needsStaffPicker) {
      items.push({ label: service.name, onClick: lockServiceSelection ? undefined : onBackToServices });
      if (needsVariantPicker) items.push({ label: copy.chooseOption, onClick: onBackToVariant });
      items.push({ label: copy.chooseTeam, onClick: onBackToStaff });
      items.push({ label: copy.dateTime, onClick: onBackToDateTime });
      items.push({ label: copy.details, current: true });
      return items;
    }
    items.push({ label: copy.dateTime, onClick: onBackToDateTime });
    items.push({ label: copy.details, current: true });
    return items;
  }

  if (showStaffStep) {
    items.push({ label: service.name, onClick: lockServiceSelection ? undefined : onBackToServices });
    if (needsVariantPicker) items.push({ label: copy.chooseOption, onClick: onBackToVariant });
    items.push({ label: copy.chooseTeam, current: true });
    return items;
  }

  if (needsStaffPicker) {
    items.push({ label: service.name, onClick: lockServiceSelection ? undefined : onBackToServices });
    if (needsVariantPicker) items.push({ label: copy.chooseOption, onClick: onBackToVariant });
    items.push({ label: copy.chooseTeam, onClick: onBackToStaff });
    items.push({ label: copy.dateTime, current: true });
    return items;
  }

  // Date/time step — service is parent crumb; current job is picking a slot
  items.push({
    label: service.name,
    onClick: lockServiceSelection ? undefined : onBackToServices,
  });
  if (needsVariantPicker) items.push({ label: copy.chooseOption, onClick: onBackToVariant });
  items.push({ label: copy.dateTime, current: true });
  return items;
}
