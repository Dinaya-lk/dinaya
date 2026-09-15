"use client";

import { useState, useEffect } from "react";

import { motion, AnimatePresence, type Variants } from "motion/react";
import { Icon } from "@/components/ui/Icon";

// Each pill scattered in its own direction — no pattern, like cards thrown on a table.
// Offsets kept small so the tilt/overlap still reads as messy, but no label clips off the card edge.
const withoutItems = [
  { num: "01", label: "WhatsApp Messages, All Day",  icon: "chat-dots",          x: 0,  y: -4, rotate: 2    },
  { num: "02", label: "Double Bookings Happen",      icon: "exclamation-circle", x: 12, y: 3,  rotate: -3.5 },
  { num: "03", label: "Chase Clients For Payment",  icon: "currency-dollar",    x: 4,  y: 1,  rotate: 2.5  },
  { num: "04", label: "One Angry Client Per Week",  icon: "emoji-frown",        x: 18, y: -2, rotate: -4   },
];

const withItems = [
  { num: "01", label: "Bookings While You Sleep",     icon: "calendar-check"  },
  { num: "02", label: "Zero Double Bookings, Ever",   icon: "check-circle"    },
  { num: "03", label: "Deposits Collected Upfront",   icon: "credit-card"     },
  { num: "04", label: "Reminders On Autopilot",       icon: "bell"            },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

// "Without" pills — enter scattered, exit with blur
const withoutVariant: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(0px)" },
  show:   { opacity: 1, y: 0,  filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
  exit:   { opacity: 0, filter: "blur(10px)", scale: 0.97, transition: { duration: 0.22, ease: "easeIn" as const } },
};

// "With" pills — assemble out of the scattered position their "without" counterpart held,
// then settle blur-free into a clean stack (the chaos resolving into order).
const withVariant: Variants = {
  hidden: (origin: { x: number; y: number; rotate: number }) => ({
    opacity: 0, x: origin.x, y: origin.y, rotate: origin.rotate, filter: "blur(8px)",
  }),
  show:   { opacity: 1, x: 0, y: 0, rotate: 0, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 280, damping: 24 } },
  exit:   { opacity: 0, filter: "blur(10px)", scale: 0.97, transition: { duration: 0.2, ease: "easeIn" as const } },
};

function WithoutPill({ item }: { item: typeof withoutItems[number] }) {
  return (
    <motion.div
      variants={withoutVariant}
      style={{
        translateX: item.x,
        translateY: item.y,
        rotate: item.rotate,
      }}
      className="flex items-center gap-2 origin-left"
    >
      {/* Pill — blue-grey scattered card look */}
      <div className="flex flex-1 items-center gap-3 rounded-full bg-[#c8d0e0] dark:bg-neutral-700 border border-[#b8c2d6] dark:border-neutral-600 px-4 py-2.5 shadow-xs">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/50 dark:bg-white/10 border border-white/60 dark:border-white/20 text-[11px] font-semibold text-slate-500 dark:text-slate-300">
          {item.num}
        </span>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-200">{item.label}</span>
      </div>

      {/* Icon badge — floating detached */}
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#c8d0e0] dark:bg-neutral-700 border border-[#b8c2d6] dark:border-neutral-600 shadow-xs">
        <Icon name={item.icon} className="text-xs text-slate-500 dark:text-slate-300" />
      </span>
    </motion.div>
  );
}

function WithPill({ item, i, origin }: { item: typeof withItems[number]; i: number; origin: { x: number; y: number; rotate: number } }) {
  return (
    <motion.div
      variants={withVariant}
      custom={origin}
      className="relative flex items-center gap-3 overflow-hidden rounded-full bg-primary px-4 py-2.5 shadow-md shadow-primary/20"
    >
      {/* Shine sweep */}
      <motion.span
        className="pointer-events-none absolute inset-0 -skew-x-12"
        initial={{ x: "-110%" }}
        animate={{ x: "220%" }}
        transition={{ delay: 0.15 + i * 0.1, duration: 0.55, ease: "easeOut" }}
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%)",
        }}
      />
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold text-white">
        {item.num}
      </span>
      <span className="flex-1 text-sm font-semibold text-white">{item.label}</span>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Icon name={item.icon} className="text-xs text-white" />
      </span>
    </motion.div>
  );
}

export function BeforeAfterToggle() {
  const [active, setActive] = useState<"without" | "with">("without");

  useEffect(() => {
    const target = document.getElementById("feature-showcase");
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActive("with");
        else setActive("without");
      },
      { threshold: 0.15 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Toggle */}
      <div className="relative flex items-center gap-1 rounded-full border border-gray-200 dark:border-neutral-800 bg-gray-100 dark:bg-neutral-800 p-1 shadow-xs">
        {(["without", "with"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            aria-pressed={active === tab}
            className={`relative z-10 rounded-full px-5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${
              active === tab
                ? tab === "with"
                  ? "text-white"
                  : "text-gray-900"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {active === tab && (
              <motion.span
                layoutId="toggle-bg"
                className={
                  tab === "without"
                    ? "absolute inset-0 rounded-full bg-white dark:bg-neutral-100"
                    : "absolute inset-0 rounded-full"
                }
                style={{
                  background: tab === "with" ? "var(--color-primary, #2563eb)" : undefined,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">
              {tab === "without" ? "Without Dinaya" : "With Dinaya"}
            </span>
          </button>
        ))}
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-gray-200 dark:border-neutral-700 bg-[#edf0f5] dark:bg-neutral-900 overflow-hidden p-5 shadow-xs dark:bg-[radial-gradient(circle,rgb(64_64_64)_1px,transparent_1px)]"
        style={{
          minHeight: "290px",
          backgroundImage:
            "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        {/* Horizontal stripe bands behind pills */}
        <AnimatePresence initial={false}>
          {active === "without" && (
            <motion.div
              key="stripes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 rounded-2xl"
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 h-11 bg-slate-400/6"
                  style={{ top: `${24 + i * 54}px` }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {active === "without" ? (
            <motion.div
              key="without"
              variants={container}
              initial="hidden"
              animate="show"
              exit="exit"
              className="relative space-y-3"
            >
              {withoutItems.map((item) => (
                <WithoutPill key={item.num} item={item} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="with"
              variants={container}
              initial="hidden"
              animate="show"
              exit="exit"
              className="relative space-y-3"
            >
              {withItems.map((item, i) => (
                <WithPill
                  key={item.num}
                  item={item}
                  i={i}
                  origin={{ x: withoutItems[i].x, y: withoutItems[i].y, rotate: withoutItems[i].rotate }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
