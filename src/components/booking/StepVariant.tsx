"use client";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { BookingCopy } from "@/lib/i18n";
import type { BookingService } from "./BookingWizard";
import type { ServicePriceVariant } from "@/lib/service-variants";
import { BookingServicePrice } from "./BookingServicePrice";

const rowFocus =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--booking-accent-soft) focus-visible:ring-offset-2";

interface Props {
  service: BookingService;
  selectedId: string | null;
  copy: BookingCopy;
  onSelect: (variant: ServicePriceVariant) => void;
}

export default function StepVariant({ service, selectedId, copy, onSelect }: Props) {
  const variants = service.priceVariants ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-2 md:px-6 md:py-6 lg:px-8">
      <div className="mb-6 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
        <p className="text-base font-semibold text-foreground md:text-sm">{service.name}</p>
      </div>

      <h2 className="mb-1 font-cal text-xl text-balance text-foreground md:text-2xl">{copy.chooseOption}</h2>
      <p className="mb-6 text-base leading-relaxed text-pretty text-muted-foreground md:text-sm">
        {copy.chooseOptionHint}
      </p>

      <div className="space-y-2.5" role="listbox" aria-label={copy.chooseOption}>
        {variants.map((variant) => {
          const isSelected = selectedId === variant.id;
          return (
            <button
              key={variant.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(variant)}
              className={cn(
                "flex w-full min-h-11 items-center gap-3 rounded-[1.375rem] border px-4 py-3.5 text-left transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.96] motion-reduce:active:scale-100",
                rowFocus,
                isSelected
                  ? "booking-border-accent booking-bg-accent-muted ring-2 booking-ring-accent"
                  : "border-border bg-card hover:border-(--booking-accent)/50 hover:bg-muted/30",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-foreground md:text-sm">{variant.label}</p>
              </div>
              <div className="shrink-0 text-sm">
                <BookingServicePrice priceLkr={variant.priceLkr} />
              </div>
              <div
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected ? "booking-border-accent booking-bg-accent" : "border-muted-foreground/30",
                )}
              >
                {isSelected && <Icon name="check" className="text-white" style={{ fontSize: "0.75rem" }} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
