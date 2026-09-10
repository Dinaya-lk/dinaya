"use client";

import Image from "next/image";
import type { Staff } from "@/db/schema";
import type { BookingCopy } from "@/lib/i18n";
import { getEligibleStaff } from "@/lib/booking-staff";
import { isOptimizableRemoteImage, cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import type { BookingService } from "./BookingWizard";
import { BookingServicePrice } from "./BookingServicePrice";

const rowFocus =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--booking-accent-soft) focus-visible:ring-offset-2";

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

interface Props {
  service: BookingService;
  allStaff: Staff[];
  staffServiceMap: { staffId: string; serviceId: string }[];
  staffLocationMap?: { staffId: string; locationId: string }[];
  locationId?: string | null;
  selected: Staff | null;
  anyStaffSelected?: boolean;
  copy: BookingCopy;
  onSelect: (staff: Staff) => void;
  onSelectAny?: () => void;
}

export default function StepStaff({
  service,
  allStaff,
  staffServiceMap,
  staffLocationMap,
  locationId,
  selected,
  anyStaffSelected,
  copy,
  onSelect,
  onSelectAny,
}: Props) {
  const eligible = getEligibleStaff(allStaff, staffServiceMap, service.id, staffLocationMap, locationId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-2 md:px-6 md:py-6 lg:px-8">
      <div className="mb-6 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
        <p className="text-base font-semibold text-foreground md:text-sm">{service.name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-muted-foreground md:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" className="size-3.5 shrink-0" />
            {formatDuration(service.durationMinutes)}
          </span>
          <span aria-hidden className="text-muted-foreground/50">
            ·
          </span>
          <BookingServicePrice priceLkr={service.priceLkr} />
        </div>
      </div>

      <h2 className="mb-1 font-cal text-xl text-balance text-foreground md:text-2xl">{copy.chooseTeam}</h2>
      <p className="mb-6 text-base leading-relaxed text-pretty text-muted-foreground md:text-sm">{copy.chooseTeamHint}</p>

      {eligible.length === 0 ? (
        <p className="py-8 text-center text-base text-muted-foreground md:text-sm">{copy.noStaff}</p>
      ) : (
        <div className="space-y-2.5" role="listbox" aria-label={copy.chooseTeam}>
          {onSelectAny && (
            <button
              type="button"
              role="option"
              aria-selected={anyStaffSelected}
              onClick={onSelectAny}
              className={cn(
                "flex w-full min-h-11 items-center gap-3 rounded-[1.375rem] border px-4 py-3.5 text-left transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.96] motion-reduce:active:scale-100",
                rowFocus,
                anyStaffSelected
                  ? "booking-border-accent booking-bg-accent-muted ring-2 booking-ring-accent"
                  : "border-border bg-card hover:border-(--booking-accent)/50 hover:bg-muted/30",
              )}
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full booking-bg-accent-muted booking-text-accent">
                <Icon name="lightning-charge-fill" className="text-base" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-foreground md:text-sm">{copy.anyAvailableStaff}</p>
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground md:text-xs">
                  {copy.anyAvailableStaffHint}
                </p>
              </div>
              <div
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  anyStaffSelected
                    ? "booking-border-accent booking-bg-accent"
                    : "border-muted-foreground/30",
                )}
              >
                {anyStaffSelected && <Icon name="check" className="text-white" style={{ fontSize: "0.75rem" }} />}
              </div>
            </button>
          )}
          {eligible.map((s) => {
            const isSelected = !anyStaffSelected && selected?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelect(s)}
                className={cn(
                  "flex w-full min-h-11 items-center gap-3 rounded-[1.375rem] border px-4 py-3.5 text-left transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.96] motion-reduce:active:scale-100",
                  rowFocus,
                  isSelected
                    ? "booking-border-accent booking-bg-accent-muted ring-2 booking-ring-accent"
                    : "border-border bg-card hover:border-(--booking-accent)/50 hover:bg-muted/30",
                )}
              >
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full booking-bg-accent-muted text-sm font-bold booking-text-accent">
                  {s.avatarUrl ? (
                    <Image
                      src={s.avatarUrl}
                      alt={s.name}
                      width={44}
                      height={44}
                      className="size-11 rounded-full object-cover image-depth"
                      unoptimized={!isOptimizableRemoteImage(s.avatarUrl)}
                    />
                  ) : (
                    s.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-foreground md:text-sm">{s.name}</p>
                  {s.bio ? (
                    <p className="mt-0.5 text-sm leading-snug text-muted-foreground md:text-xs">{s.bio}</p>
                  ) : null}
                </div>
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isSelected
                      ? "booking-border-accent booking-bg-accent"
                      : "border-muted-foreground/30",
                  )}
                >
                  {isSelected && <Icon name="check" className="text-white" style={{ fontSize: "0.75rem" }} />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
