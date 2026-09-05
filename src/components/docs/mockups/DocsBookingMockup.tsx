"use client";

import { cn } from "@/lib/utils";
import { DocsTargetHighlight } from "../DocsTargetHighlight";
import { Icon } from "@/components/ui/Icon";

type Props = {
  variant: string;
  highlightTarget?: string;
};

const services = [
  { name: "Haircut & Style", duration: "45 min", price: "Rs. 2,500", selected: true },
  { name: "Facial Treatment", duration: "60 min", price: "Rs. 3,800", selected: false },
];

const panelClass =
  "rounded-xl border border-border bg-card p-2 dark:border-white/10";

export function DocsBookingMockup({ variant, highlightTarget }: Props) {
  const step = variant.replace("booking-", "");
  const target = (id: string) => highlightTarget === id;

  return (
    <div
      data-booking-theme=""
      className="relative flex h-full flex-col overflow-hidden bg-[var(--booking-page-bg,#fff)] text-[11px] text-foreground dark:bg-background"
    >
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--booking-accent-muted)] text-sm font-bold text-[var(--booking-accent)]">
            D
          </div>
          <div className="min-w-0">
            <p className="truncate font-cal text-[13px] font-semibold tracking-tight text-foreground">
              Dilini&apos;s Studio
            </p>
            <p className="truncate text-[9px] text-muted-foreground">dilini.dinaya.lk</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 overflow-hidden px-2.5 py-2">
        {step === "service" && (
          <div className="space-y-1">
            <p className="px-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Choose service
            </p>
            {services.map((s) => (
              <DocsTargetHighlight
                key={s.name}
                active={target("booking-service-card") && s.selected}
                label="Select service"
              >
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-[1.25rem] border p-2 text-left",
                    s.selected
                      ? "border-[var(--booking-accent)] bg-[var(--booking-accent-muted)]/50 ring-2 ring-[var(--booking-accent-soft)]"
                      : "border-border/50 bg-card",
                  )}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--booking-accent-muted)] text-[10px] font-bold text-[var(--booking-accent)]">
                    {s.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <p
                        className={cn(
                          "font-medium",
                          s.selected
                            ? "text-[var(--booking-accent)]"
                            : "text-foreground",
                        )}
                      >
                        {s.name}
                      </p>
                      <p className="shrink-0 font-semibold text-[var(--booking-accent)]">
                        {s.price}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{s.duration}</p>
                  </div>
                </div>
              </DocsTargetHighlight>
            ))}
          </div>
        )}

        {step === "time" && (
          <div className={panelClass}>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Pick a time
            </p>
            <div className="grid grid-cols-3 gap-1">
              {["9:00", "10:30", "11:00", "2:00", "3:30"].map((t, i) => (
                <DocsTargetHighlight
                  key={t}
                  active={target("booking-time-slot") && i === 2}
                  label="Time slot"
                  variant="inline"
                >
                  <span
                    className={cn(
                      "block rounded-lg py-1.5 text-center text-[10px] font-semibold tabular-nums",
                      i === 2
                        ? "bg-[var(--booking-accent)] text-white ring-2 ring-[var(--booking-accent-soft)]"
                        : "border border-border bg-secondary/40 text-foreground",
                    )}
                  >
                    {t}
                  </span>
                </DocsTargetHighlight>
              ))}
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-1.5">
            <div className={panelClass}>
              <p className="font-semibold text-foreground">Haircut & Style</p>
              <p className="text-muted-foreground">Thu May 15 · 11:00</p>
              <p className="mt-0.5 font-medium text-[var(--booking-accent)]">Rs. 2,500</p>
            </div>
            <DocsTargetHighlight active={target("booking-confirm-pay")} label="Confirm & Pay">
              <button
                type="button"
                className="w-full rounded-xl bg-[var(--booking-accent)] py-2.5 text-[11px] font-semibold text-white"
              >
                Confirm & Pay
              </button>
            </DocsTargetHighlight>
          </div>
        )}

        {step === "manage" && (
          <div className={cn(panelClass, "space-y-1.5")}>
            <p className="font-semibold text-foreground">Your appointment</p>
            <p className="text-muted-foreground">Haircut · May 15, 11:00</p>
            <div className="flex gap-1">
              <DocsTargetHighlight
                active={target("booking-reschedule")}
                label="Reschedule"
                variant="inline"
                className="flex-1"
              >
                <span className="block rounded-lg border border-border py-1.5 text-center dark:border-white/10">
                  Reschedule
                </span>
              </DocsTargetHighlight>
              <DocsTargetHighlight
                active={target("booking-cancel")}
                label="Cancel"
                variant="inline"
                className="flex-1"
              >
                <span className="block rounded-lg border border-red-200 py-1.5 text-center text-red-600">
                  Cancel
                </span>
              </DocsTargetHighlight>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className={panelClass}>
            <p className="font-semibold text-foreground">Rate your visit</p>
            <DocsTargetHighlight
              active={target("booking-stars")}
              label="Star rating"
              placement="below"
            >
              <div className="my-1.5 flex gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Icon key={n} name="star-fill" className="text-[11px]" />
                ))}
              </div>
            </DocsTargetHighlight>
            <div className="min-h-[4.5rem] rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-[9px] leading-relaxed text-muted-foreground dark:border-white/10 dark:bg-neutral-900/60">
              Share a few words…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
