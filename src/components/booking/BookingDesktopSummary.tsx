"use client";

import { format, parseISO } from "date-fns";
import type { Staff } from "@/db/schema";
import type { BookingService } from "./BookingWizard";
import type { BookingCopy } from "@/lib/i18n";
import { formatLkr } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { Card, CardContent } from "@/components/ui/card";
import type { DealListItem } from "@/lib/deals/queries";
import { computeDiscountedPrice } from "@/lib/deals/pricing";

interface Props {
  copy: BookingCopy;
  service: BookingService | null;
  staff: Staff | null;
  anyStaff?: boolean;
  date: string;
  timeLabel: string;
  holdLabel?: string | null;
  selectedDeal?: DealListItem | null;
}

export default function BookingDesktopSummary({
  copy,
  service,
  staff,
  anyStaff,
  date,
  timeLabel,
  selectedDeal,
}: Props) {
  if (!service) {
    return (
      <Card className="mt-6 border-dashed bg-muted/30">
        <CardContent className="flex items-start gap-3 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg booking-bg-accent-muted">
            <Icon name="calendar2-week" className="text-lg booking-text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{copy.selectServiceHint}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.chooseServiceAndTime}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dateLabel = date ? format(parseISO(date + "T12:00:00"), "EEE, d MMM yyyy") : null;

  const price =
    selectedDeal && service.priceLkr > 0
      ? computeDiscountedPrice(service.priceLkr, selectedDeal.discountPercent)
      : service.priceLkr;

  const depositPreview =
    service.depositPercent > 0 && service.priceLkr > 0
      ? Math.ceil((price * service.depositPercent) / 100)
      : price;

  return (
    <Card className="mt-6 bg-muted/20">
      <CardContent className="p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.yourBooking}
        </p>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <Icon name="scissors" className="mt-0.5 booking-text-accent" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{service.name}</p>
              <p className="text-xs text-muted-foreground">
                {service.durationMinutes} min
                {service.priceLkr > 0 ? ` · ${formatLkr(price)}` : " · Free"}
              </p>
              {service.requiresPayment && service.depositPercent > 0 && service.priceLkr > 0 && (
                <p className="mt-0.5 text-[11px] font-medium booking-text-accent">
                  {copy.depositDue}: {formatLkr(depositPreview)}
                </p>
              )}
            </div>
          </li>
          {(staff || anyStaff) && (
            <li className="flex items-center gap-3">
              <Icon name="person" className="booking-text-accent" />
              <span className="text-foreground">
                {anyStaff && !staff ? copy.anyAvailableStaff : staff?.name}
              </span>
            </li>
          )}
          {dateLabel && (
            <li className="flex items-center gap-3">
              <Icon name="calendar3" className="booking-text-accent" />
              <span className="text-foreground">{dateLabel}</span>
            </li>
          )}
          {timeLabel && (
            <li className="flex items-center gap-3">
              <Icon name="clock" className="text-[#00D492]" />
              <span className="font-medium text-foreground">{timeLabel}</span>
            </li>
          )}
        </ul>
        {!dateLabel && (
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{copy.pickDateTime}</p>
        )}
      </CardContent>
    </Card>
  );
}
