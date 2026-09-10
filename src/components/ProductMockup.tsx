"use client";

import { useState, useEffect, useEffectEvent, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "motion/react";
import IPhoneMockup from "@/components/ui/iphone-mockup";
import { Icon } from "@/components/ui/Icon";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LANDING_LIVE_DEMO_PATH } from "@/lib/landing-demo";

type DayCell = { day: number | null; status?: "available" | "booked" | "selected" };

type Slot = { label: string; badge?: string };

type PersonaData = {
  id: string;
  label: string;
  business: string;
  blurb: string;
  icon: string;
  categoryName: string;
  accent: string;
  services: { name: string; description: string; duration: string; price: string; selected: boolean }[];
  slots: Slot[];
  trust: { rating: number; bookings: number };
};

const INITIAL_SELECTED_SLOT = 2;
/** How long each “scene” holds before the next brand. */
const PERSONA_ROTATE_MS = 5200;
/** Crossfade / slide between brands — video-like dissolve. */
const SCENE_TRANSITION = { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const };

const personas: PersonaData[] = [
  {
    id: "salon",
    label: "Salon",
    business: "Dilini's Beauty Studio",
    blurb: "Cut, colour, and styling — book the chair, not the chat.",
    icon: "scissors",
    categoryName: "Hair Services",
    accent: "#2563eb",
    services: [
      { name: "Haircut & Style", description: "Wash, cut, and blow-dry finish.", duration: "45 min", price: "Rs. 2,500", selected: true },
      { name: "Facial Treatment", description: "Deep cleanse with hydrating mask.", duration: "60 min", price: "Rs. 3,800", selected: false },
      { name: "Eyebrow Threading", description: "Precise natural shape, no wax.", duration: "20 min", price: "Rs. 800", selected: false },
    ],
    slots: [
      { label: "9:00 AM" },
      { label: "10:30 AM" },
      { label: "11:00 AM" },
      { label: "2:00 PM" },
      { label: "3:30 PM" },
      { label: "4:00 PM", badge: "Last slot!" },
    ],
    trust: { rating: 4.9, bookings: 240 },
  },
  {
    id: "barber",
    label: "Barber",
    business: "Ridge & Blade",
    blurb: "Fades, beard work, and walk-ins that actually stay on time.",
    icon: "scissors",
    categoryName: "Barber",
    accent: "#0f766e",
    services: [
      { name: "Skin Fade", description: "Clippers and straight-razor line-up.", duration: "35 min", price: "Rs. 1,800", selected: true },
      { name: "Beard Trim", description: "Shape and edge, hot towel finish.", duration: "20 min", price: "Rs. 900", selected: false },
      { name: "Hot Towel Shave", description: "Traditional straight-razor shave.", duration: "40 min", price: "Rs. 2,200", selected: false },
    ],
    slots: [
      { label: "10:00 AM" },
      { label: "11:15 AM" },
      { label: "12:30 PM" },
      { label: "3:00 PM" },
      { label: "4:15 PM" },
      { label: "5:30 PM" },
    ],
    trust: { rating: 4.8, bookings: 186 },
  },
  {
    id: "clinic",
    label: "Clinic",
    business: "Lotus Dental Care",
    blurb: "Consults and cleanings with deposits — fewer no-shows.",
    icon: "hospital",
    categoryName: "Dental",
    accent: "#0284c7",
    services: [
      { name: "Dental Check-up", description: "Full exam and X-ray review.", duration: "30 min", price: "Rs. 3,500", selected: true },
      { name: "Scaling & Polish", description: "Plaque removal and stain polish.", duration: "45 min", price: "Rs. 6,000", selected: false },
      { name: "Whitening Consult", description: "Shade check and treatment plan.", duration: "20 min", price: "Rs. 2,000", selected: false },
    ],
    slots: [
      { label: "8:30 AM" },
      { label: "9:45 AM" },
      { label: "11:00 AM" },
      { label: "1:30 PM" },
      { label: "3:00 PM" },
      { label: "4:15 PM" },
    ],
    trust: { rating: 4.9, bookings: 312 },
  },
  {
    id: "tuition",
    label: "Tuition",
    business: "Keys & Scales Studio",
    blurb: "Parents book the next lesson — you stop chasing WhatsApp groups.",
    icon: "book-half",
    categoryName: "Music lessons",
    accent: "#7c3aed",
    services: [
      { name: "Piano — 45 min", description: "One-on-one, beginner to advanced.", duration: "45 min", price: "Rs. 2,000", selected: true },
      { name: "Guitar — 30 min", description: "Chords, technique, and song practice.", duration: "30 min", price: "Rs. 1,500", selected: false },
      { name: "Trial Lesson", description: "Meet your teacher, no commitment.", duration: "30 min", price: "Rs. 1,000", selected: false },
    ],
    slots: [
      { label: "3:00 PM" },
      { label: "3:45 PM" },
      { label: "4:30 PM" },
      { label: "5:15 PM" },
      { label: "6:00 PM" },
      { label: "6:45 PM" },
    ],
    trust: { rating: 5.0, bookings: 98 },
  },
  {
    id: "spa",
    label: "Spa",
    business: "Ambara Wellness",
    blurb: "Massage and facials that feel like your brand, not a generic form.",
    icon: "heart-pulse",
    categoryName: "Wellness",
    accent: "#059669",
    services: [
      { name: "Signature Massage", description: "Full-body, pressure adjusted to you.", duration: "60 min", price: "Rs. 5,500", selected: true },
      { name: "Deep Cleanse Facial", description: "Extraction, mask, and hydration.", duration: "50 min", price: "Rs. 4,800", selected: false },
      { name: "Head & Shoulder", description: "Tension relief for neck and back.", duration: "30 min", price: "Rs. 2,800", selected: false },
    ],
    slots: [
      { label: "10:00 AM" },
      { label: "11:30 AM" },
      { label: "1:00 PM" },
      { label: "2:30 PM" },
      { label: "4:00 PM" },
      { label: "5:30 PM" },
    ],
    trust: { rating: 4.9, bookings: 167 },
  },
];

const mockDays: DayCell[] = [
  { day: null }, { day: null }, { day: null },
  { day: 1 }, { day: 2 }, { day: 3 }, { day: 4 },
  { day: 5, status: "booked" }, { day: 6, status: "booked" },
  { day: 7 }, { day: 8 }, { day: 9 }, { day: 10 }, { day: 11 },
  { day: 12, status: "available" }, { day: 13, status: "available" }, { day: 14, status: "available" },
  { day: 15, status: "selected" },
  { day: 16 }, { day: 17 }, { day: 18 },
  { day: 19, status: "available" }, { day: 20, status: "available" }, { day: 21, status: "available" },
  { day: 22 }, { day: 23 }, { day: 24 }, { day: 25 },
];

/** Visual scale for the landing demo (~20% larger). */
const DEMO_SCALE = 1.2;

function demoAccentStyle(accent: string, isDark = false): CSSProperties {
  return {
    ["--demo-accent" as string]: accent,
    /* Former “white” chrome → bold brand colour */
    ["--demo-surface" as string]: accent,
    ["--demo-surface-deep" as string]: `color-mix(in srgb, ${accent} 82%, black)`,
    ["--demo-canvas" as string]: isDark ? "#18181b" : "#ffffff",
    ["--demo-chrome" as string]: isDark ? "#18181b" : "#ffffff",
    ["--demo-chrome-text" as string]: isDark ? "#e4e4e7" : "#374151",
    ["--demo-chrome-text-muted" as string]: isDark ? "#a1a1aa" : "#4b5563",
    ["--demo-chrome-pill" as string]: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)",
    ["--demo-chrome-pill-border" as string]: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
    ["--demo-accent-soft" as string]: `color-mix(in srgb, ${accent} 22%, transparent)`,
    ["--demo-accent-ring" as string]: `color-mix(in srgb, ${accent} 55%, white)`,
    ["--demo-slot" as string]: "rgba(255,255,255,0.14)",
    ["--demo-slot-border" as string]: "rgba(255,255,255,0.28)",
    ["--demo-on-accent" as string]: "#ffffff",
    ["--demo-on-accent-muted" as string]: "rgba(255,255,255,0.78)",
  };
}

function DinayaLogo({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="318 319 875 866" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor">
      <path d="M 819.949219 499.695312 L 563.980469 755.773438 C 513.210938 806.554688 513.210938 889.15625 563.980469 939.941406 C 614.75 990.777344 697.378906 990.726562 748.09375 939.941406 L 966.117188 721.851562 C 982.484375 705.480469 982.484375 678.953125 966.117188 662.582031 C 949.75 646.207031 923.230469 646.207031 906.863281 662.582031 L 688.84375 880.671875 C 670.753906 898.707031 641.375 898.761719 623.234375 880.671875 C 605.144531 862.578125 605.144531 833.132812 623.234375 815.042969 L 879.203125 558.96875 C 931.742188 506.464844 1017.1875 506.464844 1069.671875 558.96875 C 1095.097656 584.425781 1109.117188 618.265625 1109.117188 654.257812 C 1109.117188 690.226562 1095.097656 724.0625 1069.671875 749.523438 L 782.496094 1036.789062 C 740.375 1078.921875 684.367188 1102.117188 624.816406 1102.117188 C 565.261719 1102.117188 509.285156 1078.921875 467.164062 1036.789062 C 380.222656 949.820312 380.222656 808.328125 467.164062 721.359375 L 797.144531 391.253906 C 813.511719 374.878906 813.511719 348.355469 797.144531 331.980469 C 780.773438 315.609375 754.257812 315.609375 737.890625 331.980469 L 407.910156 662.089844 C 288.285156 781.722656 288.285156 976.425781 407.910156 1096.058594 C 465.828125 1154.019531 542.867188 1185.945312 624.816406 1185.945312 C 706.765625 1185.945312 783.804688 1154.019531 841.746094 1096.058594 L 1128.925781 808.792969 C 1214.121094 723.570312 1214.121094 584.917969 1128.925781 499.695312 C 1043.78125 414.558594 905.144531 414.445312 819.949219 499.695312 Z" />
    </svg>
  );
}

function DinayaBranding({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card ${compact ? "px-2.5 py-1" : "px-3 py-1.5"}`}>
      <span className={`text-muted-foreground ${compact ? "text-[11px]" : "text-xs"}`}>Powered by</span>
      <span className="inline-flex items-center gap-1 text-foreground">
        <DinayaLogo size={compact ? 11 : 15} />
        <span className={`font-cal leading-none text-foreground ${compact ? "text-[11px]" : "text-xs"}`}>Dinaya.lk</span>
      </span>
    </div>
  );
}

function TrustLine({ persona, onAccent = false }: { persona: PersonaData; onAccent?: boolean }) {
  return (
    <p className={`mt-0.5 text-xs tabular-nums ${onAccent ? "text-white/85" : "text-foreground/55"}`}>
      {persona.trust.rating} ★ · {persona.trust.bookings} bookings
    </p>
  );
}

function CalendarDay({ cell }: { cell: DayCell }) {
  const d = cell.day;
  if (!d) return <div />;

  const isSelected = cell.status === "selected";
  const isBooked = cell.status === "booked";
  const isAvailable = cell.status === "available";

  return (
    <div
      className={`relative mx-auto flex size-7 items-center justify-center rounded-lg text-[9px] font-medium tabular-nums transition-[background-color,color,transform,box-shadow] duration-300 ease-out xl:size-8 xl:rounded-xl xl:text-[10px] ${
        isSelected
          ? "bg-white shadow-md"
          : isBooked
            ? "cursor-not-allowed text-white/30 line-through"
            : "text-white/90 hover:bg-white/10"
      }`}
      style={isSelected ? { color: "var(--demo-accent)" } : undefined}
    >
      {d}
      {isAvailable && !isSelected ? (
        <span className="absolute bottom-0.5 size-1 rounded-full bg-white" />
      ) : null}
    </div>
  );
}

function BackPill({ label, onAccent = false }: { label: string; onAccent?: boolean }) {
  if (onAccent) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[10px] font-medium text-white shadow-xs backdrop-blur-xs">
        <Icon name="chevron-left" className="text-[8px]" />
        {label}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium shadow-xs backdrop-blur-xs"
      style={{
        border: "1px solid var(--demo-chrome-pill-border)",
        backgroundColor: "var(--demo-chrome-pill)",
        color: "var(--demo-chrome-text)",
      }}
    >
      <Icon name="chevron-left" className="text-[8px]" />
      {label}
    </span>
  );
}

function CategoryPill({ label, onAccent = false }: { label: string; onAccent?: boolean }) {
  if (onAccent) {
    return (
      <span className="inline-flex max-w-36 shrink-0 items-center truncate rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/90">
        {label}
      </span>
    );
  }
  return (
    <span
      className="inline-flex max-w-36 shrink-0 items-center truncate rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        border: "1px solid var(--demo-chrome-pill-border)",
        backgroundColor: "color-mix(in srgb, var(--demo-chrome-pill) 78%, transparent)",
        color: "var(--demo-chrome-text-muted)",
      }}
    >
      {label}
    </span>
  );
}

function BookingContextNav({
  backLabel,
  categoryLabel,
  onAccent = false,
}: {
  backLabel: string;
  categoryLabel: string;
  onAccent?: boolean;
}) {
  return (
    <nav aria-label="Booking context" className="flex min-w-0 items-center gap-2">
      <BackPill label={backLabel} onAccent={onAccent} />
      <CategoryPill label={categoryLabel} onAccent={onAccent} />
    </nav>
  );
}

function BrandMark({ icon, onAccent = false }: { icon: string; onAccent?: boolean }) {
  return (
    <div
      className="flex size-[36px] shrink-0 items-center justify-center rounded-full transition-[background-color,color] duration-300 ease-out xl:size-9"
      style={
        onAccent
          ? { backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }
          : { backgroundColor: "var(--demo-accent)", color: "#fff" }
      }
    >
      <Icon name={icon} className="text-[13px] xl:text-sm" />
    </div>
  );
}

function PhoneDateTimeScreen({
  persona,
  selectedSlot,
  onSelectSlot,
  isDark = false,
}: {
  persona: PersonaData;
  selectedSlot: number;
  onSelectSlot: (index: number) => void;
  isDark?: boolean;
}) {
  const selectedService = persona.services.find((s) => s.selected)!;
  const selectedTime = persona.slots[selectedSlot]?.label ?? persona.slots[0].label;

  return (
    <div
      className="flex h-full w-full flex-col transition-[background-color] duration-500 ease-out"
      style={{ ...demoAccentStyle(persona.accent, isDark), backgroundColor: "var(--demo-canvas)" }}
    >
      <div
        className="px-[14px] pb-3 pt-[58px] transition-[background-color] duration-500 ease-out"
        style={{ backgroundColor: "var(--demo-accent)" }}
      >
        <BookingContextNav backLabel="All services" categoryLabel={persona.categoryName} onAccent />
        <div className="mt-3 flex items-start gap-[10px]">
          <BrandMark icon={persona.icon} onAccent />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">{persona.business}</p>
            <TrustLine persona={persona} onAccent />
          </div>
        </div>
      </div>

      <div
        className="mx-[14px] mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl shadow-xs"
        style={{ backgroundColor: "var(--demo-surface-deep)" }}
      >
        <div className="px-3 pb-[10px] pt-3">
          <p className="text-[15px] font-semibold leading-tight text-white">{selectedService.name}</p>
          <p className="mt-[6px] flex items-center gap-[6px] text-[11px] text-white/75">
            <Icon name="clock" className="text-[11px] text-white" />
            {selectedService.duration.replace(" min", "m")}
            <span className="text-white/35">·</span>
            <span className="font-medium tabular-nums text-white">{selectedService.price}</span>
          </p>
        </div>

        <div
          className="border-y border-white/15 py-[10px] px-3 transition-[background-color] duration-500"
          style={{ backgroundColor: "var(--demo-accent)" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white">May 2025</span>
            <div className="flex gap-1 text-white">
              <Icon name="chevron-left" className="text-[9px]" />
              <Icon name="chevron-right" className="text-[9px]" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={`${d}-${i}`} className="pb-0.5 text-[7px] font-semibold text-white/55">
                {d}
              </div>
            ))}
            {mockDays.map((cell, i) => (
              <CalendarDay key={i} cell={cell} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-[10px]">
          <p className="mb-2 text-[11px] font-semibold text-white">Thu 15 · Available times</p>
          <div className="grid grid-cols-2 gap-1.5">
            {persona.slots.map((slot, i) => (
              <SlotButton
                key={`${persona.id}-${slot.label}`}
                label={slot.label}
                selected={i === selectedSlot}
                onSelect={() => onSelectSlot(i)}
              />
            ))}
          </div>
        </div>

        <div className="px-3 pb-[16px] pt-[10px]">
          <button
            type="button"
            className="w-full rounded-xl bg-white py-[12px] text-[13px] font-semibold shadow-md transition-[transform,background-color] duration-300 ease-out active:scale-[0.96] motion-reduce:active:scale-100"
            style={{ color: "var(--demo-accent)" }}
          >
            Continue · {selectedTime}
          </button>
        </div>
      </div>

      <div className="flex justify-center py-[8px]">
        <DinayaBranding compact />
      </div>
    </div>
  );
}

function SlotButton({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-[34px] w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-medium tabular-nums transition-[transform,background-color,border-color,box-shadow,color] duration-300 ease-out active:scale-[0.96] motion-reduce:active:scale-100 ${
        selected ? "border-transparent bg-white shadow-md" : "text-white"
      }`}
      style={
        selected
          ? { color: "var(--demo-accent)" }
          : {
              backgroundColor: "var(--demo-slot)",
              borderColor: "var(--demo-slot-border)",
            }
      }
    >
      {!selected ? <span className="size-1.5 shrink-0 rounded-full bg-white" aria-hidden /> : null}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {selected ? <Icon name="check" className="shrink-0 text-[8px] opacity-90" /> : null}
    </button>
  );
}

function CustomerBookingDesktop({
  persona,
  selectedSlot,
  onSelectSlot,
  isDark = false,
}: {
  persona: PersonaData;
  selectedSlot: number;
  onSelectSlot: (index: number) => void;
  isDark?: boolean;
}) {
  const selectedService = persona.services.find((s) => s.selected)!;
  const selectedTime = persona.slots[selectedSlot]?.label ?? persona.slots[0].label;

  return (
    <div
      className="flex h-full flex-col overflow-hidden p-4 transition-[background-color] duration-500 ease-out sm:p-5"
      style={{
        ...demoAccentStyle(persona.accent, isDark),
        backgroundColor: "color-mix(in srgb, var(--demo-accent) 8%, var(--demo-chrome))",
      }}
    >
      <div className="mb-3 shrink-0">
        <BookingContextNav backLabel="All services" categoryLabel={persona.categoryName} />
      </div>

      <div
        className="flex min-h-0 flex-1 overflow-hidden rounded-xl shadow-[0_10px_36px_-14px_rgba(0,0,0,0.22)] ring-1"
        style={{
          backgroundColor: "var(--demo-surface)",
          ["--tw-ring-color" as string]: "var(--demo-accent-ring)",
        }}
      >
        {/* Bold brand sidebar — solid primary */}
        <aside
          className="flex w-[30%] max-w-56 shrink-0 flex-col px-3.5 py-4 text-white transition-[background-color] duration-500 ease-out xl:max-w-60 xl:px-4"
          style={{ backgroundColor: "var(--demo-accent)" }}
        >
          <div className="flex items-start gap-2.5">
            <BrandMark icon={persona.icon} onAccent />
            <div className="min-w-0 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">{persona.business}</p>
              <TrustLine persona={persona} onAccent />
            </div>
          </div>

          <div className="mt-4 border-t border-white/20 pt-4">
            <p className="text-base font-semibold leading-tight text-white">{selectedService.name}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/80 text-pretty">
              {selectedService.description}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-white/85">
              <Icon name="clock" className="text-[10px]" />
              {selectedService.duration.replace(" min", "m")}
              <span className="text-white/40">·</span>
              <span className="font-medium tabular-nums text-white">{selectedService.price}</span>
            </p>
          </div>

          <div className="mt-auto space-y-2 border-t border-white/20 pt-4 text-xs">
            <div className="flex items-center gap-2 text-white/85">
              <Icon name="calendar3" className="shrink-0 text-[11px]" />
              <span className="text-white">Thu, 15 May 2025</span>
            </div>
            <div className="flex items-center gap-2 text-white/85">
              <Icon name="clock" className="shrink-0 text-[11px]" />
              <span className="font-medium text-white">{selectedTime}</span>
            </div>
          </div>
        </aside>

        <div
          className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,11rem)] divide-x divide-white/15 xl:grid-cols-[minmax(0,1fr)_minmax(0,12.5rem)]"
          style={{ backgroundColor: "var(--demo-accent)" }}
        >
          <div
            className="p-3.5 xl:px-4"
            style={{ backgroundColor: "var(--demo-surface-deep)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white">May 2025</span>
              <div className="flex gap-1 text-white">
                <span className="flex size-6 items-center justify-center rounded-lg bg-white/15">
                  <Icon name="chevron-left" className="text-[9px]" />
                </span>
                <span className="flex size-6 items-center justify-center rounded-lg bg-white/15">
                  <Icon name="chevron-right" className="text-[9px]" />
                </span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="pb-1 text-[8px] font-semibold tracking-wide text-white/55">
                  {d}
                </div>
              ))}
              {mockDays.map((cell, i) => (
                <CalendarDay key={i} cell={cell} />
              ))}
            </div>
          </div>

          <div className="p-3.5 xl:px-4" style={{ backgroundColor: "var(--demo-accent)" }}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-white">Thu 15</p>
              <p className="text-[10px] font-medium text-white/75">Available times</p>
            </div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/70">
              Morning
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {persona.slots.slice(0, 4).map((slot, i) => (
                <SlotButton
                  key={`${persona.id}-${slot.label}`}
                  label={slot.label}
                  selected={i === selectedSlot}
                  onSelect={() => onSelectSlot(i)}
                />
              ))}
            </div>
            <p className="mb-1.5 mt-2.5 text-[9px] font-semibold uppercase tracking-wide text-white/70">
              Afternoon
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {persona.slots.slice(4).map((slot, i) => (
                <SlotButton
                  key={`${persona.id}-${slot.label}`}
                  label={slot.label}
                  selected={i + 4 === selectedSlot}
                  onSelect={() => onSelectSlot(i + 4)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex shrink-0 justify-center">
        <DinayaBranding compact />
      </div>
    </div>
  );
}

function DemoFrame({
  children,
  accent,
  sceneKey,
  playing,
  reduceMotion,
}: {
  children: ReactNode;
  accent: string;
  sceneKey: string;
  playing: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div
      className="relative aspect-16/10 min-h-[300px] overflow-hidden rounded-2xl border border-border bg-white transition-[box-shadow,background-color] duration-700 ease-out dark:border-white/10 dark:bg-neutral-900"
      style={{
        boxShadow: `0 18px 52px -14px color-mix(in srgb, ${accent} 45%, transparent), 0 0 0 1px color-mix(in srgb, ${accent} 18%, transparent)`,
      }}
    >
      <div className="absolute inset-0">{children}</div>

      {/* Film-strip progress — fills while this brand is on screen */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[3px] bg-black/5 dark:bg-white/10">
        {playing && !reduceMotion ? (
          <motion.div
            key={sceneKey}
            className="h-full origin-left"
            style={{ backgroundColor: accent }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: PERSONA_ROTATE_MS / 1000, ease: "linear" }}
          />
        ) : (
          <div className="h-full w-0" style={{ backgroundColor: accent }} />
        )}
      </div>
    </div>
  );
}

function ThemeSwitcher({
  activeId,
  onSelect,
  playing,
  reduceMotion,
}: {
  activeId: string;
  onSelect: (index: number) => void;
  playing: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-background/80 p-1.5 shadow-xs backdrop-blur-xs"
        role="tablist"
        aria-label="Preview booking page themes"
      >
        {personas.map((p, index) => {
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(index)}
              className={`relative inline-flex min-h-10 items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96] ${
                active
                  ? "text-white"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
              style={active ? { backgroundColor: p.accent } : undefined}
            >
              {active && playing && !reduceMotion ? (
                <motion.span
                  key={`progress-${p.id}`}
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-background/50"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: PERSONA_ROTATE_MS / 1000, ease: "linear" }}
                />
              ) : null}
              <span
                className={`size-2.5 shrink-0 rounded-full ring-2 ring-white/40 transition-transform duration-300 dark:ring-black/30 ${
                  active ? "scale-110" : ""
                }`}
                style={{ backgroundColor: active ? "#fff" : p.accent }}
                aria-hidden
              />
              {p.label}
            </button>
          );
        })}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {reduceMotion ? (
          <>
            Pick a look —{" "}
            <Link href={LANDING_LIVE_DEMO_PATH} className="font-medium text-primary hover:text-primary/80">
              open a live booking page
            </Link>
          </>
        ) : playing ? (
          <>
            Autoplaying like a reel — hover the preview to pause ·{" "}
            <Link href={LANDING_LIVE_DEMO_PATH} className="font-medium text-primary hover:text-primary/80">
              open live page
            </Link>
          </>
        ) : (
          <>Paused — move away to keep playing</>
        )}
      </p>
    </div>
  );
}

export default function ProductMockup({
  variant = "default",
}: {
  variant?: "default" | "hero";
}) {
  const [selectedSlot, setSelectedSlot] = useState(INITIAL_SELECTED_SLOT);
  const [personaIndex, setPersonaIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  useEffect(() => setMounted(true), []);
  const screenBg = mounted && resolvedTheme === "dark" ? "#000000" : "#f4f4f5";
  const isDark = mounted && resolvedTheme === "dark";
  const persona = personas[personaIndex] ?? personas[0];
  const isHero = variant === "hero";
  const playing = !reduceMotion && !hoverPaused;

  const onRotate = useEffectEvent(() => {
    setPersonaIndex((i) => (i + 1) % personas.length);
    setSelectedSlot(INITIAL_SELECTED_SLOT);
  });

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => onRotate(), PERSONA_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [playing, personaIndex]);

  const selectPersona = (index: number) => {
    setPersonaIndex(index);
    setSelectedSlot(INITIAL_SELECTED_SLOT);
    // Keep autoplay — jump to that scene like skipping in a video
  };

  const mobileScale = 0.72 * DEMO_SCALE;
  const mobileOuterWidth = 417;
  const mobileOuterHeight = 876;
  const mobileScaledWidth = Math.round(mobileOuterWidth * mobileScale);
  const mobileScaledHeight = Math.round(mobileOuterHeight * mobileScale);

  return (
    <section
      className={`relative mx-auto max-w-308 overflow-x-clip px-6 md:px-12 lg:px-16 ${
        isHero ? "pb-10 md:pb-14" : "pb-16"
      }`}
    >
      {!isHero ? (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/2 left-1/2 h-[320px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-50/80 blur-2xl dark:bg-blue-950/20" />
        </div>
      ) : null}

      <div className="flex flex-col items-center md:hidden">
        <div
          className="relative mx-auto overflow-hidden"
          style={{ width: mobileScaledWidth, height: mobileScaledHeight }}
        >
          <IPhoneMockup
            model="15-pro"
            color="space-black"
            scale={mobileScale}
            screenBg={screenBg}
            shadow
            safeArea={false}
            showHomeIndicator={false}
            innerShadow={false}
            style={{ transformOrigin: "top left" }}
          >
            <PhoneDateTimeScreen
              persona={persona}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              isDark={isDark}
            />
          </IPhoneMockup>
        </div>
        <div className="mt-5 flex flex-col items-center gap-2 px-2">
          <div className="inline-flex items-center gap-2" role="tablist" aria-label="Preview booking page themes">
            {personas.map((p, index) => {
              const active = p.id === persona.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={p.label}
                  onClick={() => selectPersona(index)}
                  className={`relative size-9 overflow-hidden rounded-full transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.96] ${
                    active ? "ring-2 ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: p.accent,
                    ["--tw-ring-color" as string]: p.accent,
                  }}
                >
                  {active && playing ? (
                    <motion.span
                      key={`m-progress-${p.id}`}
                      className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-white/70"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: PERSONA_ROTATE_MS / 1000, ease: "linear" }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={persona.id}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="text-center text-xs text-muted-foreground"
            >
              {persona.business}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="mx-auto hidden max-w-5xl md:block">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Live preview</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={persona.id}
                initial={reduceMotion ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={SCENE_TRANSITION}
              >
                <p className="font-cal mt-1 text-xl tracking-tight text-foreground sm:text-2xl">
                  {persona.business}
                </p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">{persona.blurb}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {playing ? "Playing · colours morph with each brand" : "Paused · move away to resume"}
          </p>
        </div>

        <div
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
        >
          <DemoFrame
            accent={persona.accent}
            sceneKey={persona.id}
            playing={playing}
            reduceMotion={reduceMotion}
          >
            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={persona.id}
                className="absolute inset-0"
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, x: 28, filter: "blur(6px)", scale: 0.985 }
                }
                animate={{ opacity: 1, x: 0, filter: "blur(0px)", scale: 1 }}
                exit={
                  reduceMotion
                    ? undefined
                    : { opacity: 0, x: -24, filter: "blur(6px)", scale: 1.015 }
                }
                transition={SCENE_TRANSITION}
              >
                {/* Soft colour wash as the scene lands */}
                {!reduceMotion ? (
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                      background: `radial-gradient(70% 60% at 50% 40%, ${persona.accent}22, transparent 70%)`,
                    }}
                    initial={{ opacity: 0.85 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                ) : null}
                <CustomerBookingDesktop
                  persona={persona}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                  isDark={isDark}
                />
              </motion.div>
            </AnimatePresence>
          </DemoFrame>
        </div>

        <div className="mt-5">
          <ThemeSwitcher
            activeId={persona.id}
            onSelect={selectPersona}
            playing={playing}
            reduceMotion={reduceMotion}
          />
        </div>
      </div>
    </section>
  );
}
