"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/Icon";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import Link from "next/link";
import { LANDING_LIVE_DEMO_PATH } from "@/lib/landing-demo";

// ─── Highlighted verb pill ────────────────────────────────────────────────────
function Pill({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-0.5 text-primary font-medium mx-1 whitespace-nowrap">
      <Icon name={icon} className="text-sm shrink-0" />
      {children}
    </span>
  );
}

// ─── Feature 1: points to live demo (no duplicate booking UI) ───────────────
function BookingFeatureIllustration() {
  const reduceMotion = useReducedMotion();
  const [confirmed, setConfirmed] = useState(!!reduceMotion);
  const playedRef = useRef(false);

  const play = () => {
    if (playedRef.current || reduceMotion) return;
    playedRef.current = true;
    window.setTimeout(() => setConfirmed(true), 900);
  };

  return (
    <motion.div
      onViewportEnter={play}
      viewport={{ once: true, margin: "-40px" }}
      className="flex w-full max-w-xs flex-col items-center gap-4 px-4 py-2 text-center mx-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex size-16 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      >
        <Icon name="calendar-check" className="text-3xl" />
        <AnimatePresence>
          {confirmed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-green-600 text-white ring-2 ring-white dark:ring-neutral-900"
            >
              <Icon name="check-lg" className="text-[10px]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
        Your clients book on a page like the live demo above — calendar, slots, and payment in one flow.
      </p>
      <Link
        href={LANDING_LIVE_DEMO_PATH}
        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        Try live booking page
        <Icon
          name="box-arrow-up-right"
          className="text-xs transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </Link>
    </motion.div>
  );
}

// ─── Mockup 2: Payment ────────────────────────────────────────────────────────
function PaymentMockup() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState(reduceMotion ? 2 : 0);
  const playedRef = useRef(false);

  const play = () => {
    if (playedRef.current || reduceMotion) return;
    playedRef.current = true;
    window.setTimeout(() => setPhase(1), 900);
    window.setTimeout(() => setPhase(2), 2000);
  };

  const isPaid = phase >= 1;
  const notified = phase === 2;

  return (
    <motion.div
      onViewportEnter={play}
      viewport={{ once: true, margin: "-40px" }}
      className="w-full max-w-xs mx-auto space-y-2.5"
    >
      <div className="rounded-2xl border border-white/70 bg-white/80 dark:border-neutral-700/70 dark:bg-neutral-900/80 shadow-lg overflow-hidden" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <motion.div
          animate={{ backgroundColor: isPaid ? "rgb(22 163 74)" : "rgb(120 113 108)" }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="px-4 py-3 flex items-center gap-2.5"
        >
          <motion.div
            key={isPaid ? "paid-icon" : "pending-icon"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.4 }}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20"
          >
            <Icon name={isPaid ? "check-circle" : "clock-history"} className="text-white text-sm" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={isPaid ? "paid-label" : "pending-label"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="truncate text-white font-semibold text-xs"
              >
                {isPaid ? "Deposit received" : "Waiting for payment"}
              </motion.div>
            </AnimatePresence>
            <div className="truncate text-white/80 text-[11px]">PayHere · •••• 4242</div>
          </div>
          <div className="shrink-0 text-white font-bold text-sm tabular-nums">
            <AnimatePresence initial={false} mode="popLayout">
              {isPaid ? (
                <motion.span
                  key="paid-amount"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  className="block"
                >
                  Rs. 1,250
                </motion.span>
              ) : (
                <motion.span
                  key="pending-amount"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  className="block"
                >
                  Pending
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        <div className="px-4 py-3 space-y-1.5">
          {[
            { label: "Client", value: "Kavya Senanayake" },
            { label: "Service", value: "Haircut & Style" },
            { label: "Appointment", value: "Thu 22 May · 10:30 AM" },
          ].map((r) => (
            <div key={r.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{r.value}</span>
            </div>
          ))}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Balance on arrival</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Rs. <NumberTicker value={isPaid ? 1250 : 2500} className="text-gray-900 dark:text-gray-100" />
            </span>
          </div>
        </div>
      </div>
      <motion.div
        animate={notified ? { opacity: 1, y: 0 } : { opacity: 0.45, y: 4 }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="flex items-center gap-2 rounded-full border border-white/60 bg-white/80 dark:border-neutral-700/60 dark:bg-neutral-900/80 px-3 py-2 shadow-xs w-fit mx-auto"
        style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
      >
        <div className="flex size-5 items-center justify-center rounded-full bg-primary/10">
          <Icon name={notified ? "check-circle" : "bell"} className="text-[10px] text-primary" />
        </div>
        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
          {notified ? "Owner notified instantly" : "Sending owner notification..."}
        </span>
      </motion.div>
    </motion.div>
  );
}

// ─── Mockup 3: Reminders ──────────────────────────────────────────────────────
function RemindersMockup() {
  const reduceMotion = useReducedMotion();
  const reminders = [
    { name: "Kavya S.", time: "10:30 AM", service: "Haircut & Style" },
    { name: "Nimal P.", time: "2:00 PM", service: "Facial Treatment" },
    { name: "Amali K.", time: "3:30 PM", service: "Eyebrow Threading" },
  ];
  const [step, setStep] = useState(reduceMotion ? reminders.length + 1 : 0);
  const playedRef = useRef(false);

  const play = () => {
    if (playedRef.current || reduceMotion) return;
    playedRef.current = true;
    reminders.forEach((_, i) => {
      window.setTimeout(() => setStep(i + 1), 500 + i * 650);
    });
    window.setTimeout(() => setStep(reminders.length + 1), 500 + reminders.length * 650 + 350);
  };

  const sendingIndex = step < reminders.length ? step : -1;
  const sentCount = Math.min(step, reminders.length);

  return (
    <motion.div onViewportEnter={play} viewport={{ once: true, margin: "-40px" }} className="w-full max-w-xs mx-auto space-y-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <motion.div
            key={`reminder-bell-${step}`}
            animate={sendingIndex >= 0 ? { rotate: [0, -10, 10, -6, 6, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex size-6 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/50"
          >
            <Icon name="bell" className="text-[10px] text-violet-600 dark:text-violet-400" />
          </motion.div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Automated reminders</span>
        </div>
        <motion.span
          key={`sent-count-${sentCount}`}
          initial={{ scale: 0.86, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="text-[11px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/50 rounded-full px-2 py-0.5"
        >
          {sentCount} sent today
        </motion.span>
      </div>
      {reminders.map((r, i) => {
        const isSent = i < sentCount;
        const isSending = i === sendingIndex;
        const status: { label: string; icon?: string } = (() => {
          if (isSending) return { label: "Sending" };
          if (!isSent) return { label: "Queued" };
          if (i === 0 && sentCount >= 2) return { label: "Confirmed", icon: "check-circle-fill" };
          return { label: "Delivered" };
        })();
        const statusTone = status.label === "Confirmed"
          ? "text-green-600"
          : status.label === "Delivered"
            ? "text-emerald-600"
            : isSending
              ? "text-primary"
              : "text-muted-foreground";

        return (
        <motion.div
          key={r.name}
          animate={{
            opacity: isSent || isSending ? 1 : 0.62,
            x: isSending ? 4 : 0,
            y: isSending ? -1 : 0,
            scale: isSending ? 1.01 : 1,
            boxShadow: isSending
              ? "0 8px 24px rgba(37,99,235,0.12)"
              : "0 1px 2px rgba(15,23,42,0.03)",
          }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-2.5 rounded-xl border border-white/60 bg-white/80 dark:border-neutral-700/60 dark:bg-neutral-900/80 px-3 py-2.5 shadow-xs"
          style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
        >
          <motion.div
            animate={isSending ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.9, repeat: isSending ? Number.POSITIVE_INFINITY : 0, ease: "easeInOut" }}
            className="shrink-0"
          >
            <Avatar>
              <AvatarFallback className="bg-violet-100 text-[11px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                {r.name[0]}{r.name.split(" ")[1]?.[0]}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{r.name}</span>
              <span className="text-[11px] text-muted-foreground">{r.time}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground truncate">{r.service}</span>
              <motion.span
                key={`${r.name}-${status.label}`}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`text-[11px] font-medium ml-2 shrink-0 inline-flex items-center gap-0.5 ${statusTone} ${isSending ? "rounded-full bg-primary/10 px-1.5 py-0.5" : ""}`}
              >
                {status.icon && <Icon name={status.icon} className="text-[9px]" />}
                {status.label}
                {isSending && (
                  <span className="inline-flex items-center gap-[2px] ml-px">
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={`${r.name}-dot-${dot}`}
                        animate={{ opacity: [0.25, 1, 0.25], y: [0, -1, 0] }}
                        transition={{ duration: 0.65, repeat: Number.POSITIVE_INFINITY, delay: dot * 0.12, ease: "easeInOut" }}
                        className="block size-[2.5px] rounded-full bg-current"
                      />
                    ))}
                  </span>
                )}
              </motion.span>
            </div>
          </div>
        </motion.div>
      );})}
    </motion.div>
  );
}

// ─── Feature card data ────────────────────────────────────────────────────────
const features = [
  {
    num: "01", tag: "SELF-BOOKING",
    headlinePre: "Dinaya", verb: { icon: "calendar-check", label: "books" }, headlinePost: "clients while you sleep.",
    desc: "Your own page at yourname.dinaya.lk. Clients pick a time and pay — without a single WhatsApp message.",
    mockup: <BookingFeatureIllustration />,
    mockupBg: "bg-amber-300/20",
  },
  {
    num: "02", tag: "PAYMENTS",
    headlinePre: "Dinaya", verb: { icon: "credit-card", label: "collects" }, headlinePost: "deposits before they arrive.",
    desc: "Accept a deposit via PayHere the moment a booking is made. No-shows drop to zero, overnight.",
    mockup: <PaymentMockup />,
    mockupBg: "bg-green-300/20",
  },
  {
    num: "03", tag: "REMINDERS",
    headlinePre: "Dinaya", verb: { icon: "bell", label: "reminds" }, headlinePost: "clients so you never have to.",
    desc: "SMS and email reminders go out automatically before every appointment. Clients confirm. You relax.",
    mockup: <RemindersMockup />,
    mockupBg: "bg-violet-300/20",
  },
];

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ f, i, reduceMotion }: { f: typeof features[number]; i: number; reduceMotion: boolean }) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={reduceMotion ? undefined : { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (i % 2) * 0.12 }}
      className="rounded-3xl overflow-hidden border border-gray-200/80 bg-white shadow-xs dark:border-neutral-700/50 dark:bg-neutral-900"
    >
      {/* Mockup area */}
      <div
        className={`${f.mockupBg} px-8 py-10 flex items-center justify-center bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)]`}
        style={{
          backgroundSize: "20px 20px",
        }}
      >
        {f.mockup}
      </div>

      {/* Text area */}
      <div className="px-7 py-6 border-t border-white/50 dark:border-neutral-800/80">
        <div className="text-xs font-bold tracking-widest text-muted-foreground mb-3">
          {f.num} · {f.tag}
        </div>
        <h3 className="font-cal text-2xl tracking-tight text-balance text-gray-900 dark:text-gray-100 leading-snug">
          {f.headlinePre}
          <Pill icon={f.verb.icon}>{f.verb.label}</Pill>
          {f.headlinePost}
        </h3>
        <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed text-pretty">
          {f.desc}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function FeatureShowcase() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative overflow-hidden">
      {/* Background blobs for glass to blur through */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -top-48 -right-24 size-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-40 size-[400px] rounded-full bg-violet-500/5 blur-3xl" />
      </div>
    <section className="max-w-6xl mx-auto px-6 py-20 border-t">
      <div className="text-center mb-14">
        <span className="relative text-sm font-semibold tracking-tight text-primary">
          <span className="absolute top-0.5 -left-3 h-4 w-[3px] rounded-r-sm bg-primary" />
          What Dinaya does
        </span>
        <h2 className="font-cal text-3xl md:text-4xl mt-3 tracking-tight">
          Everything your booking needs
        </h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
          Booking, payments, and reminders — the three things that replace WhatsApp chaos.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <FeatureCard key={f.num} f={f} i={i} reduceMotion={reduceMotion} />
        ))}
      </div>
    </section>
    </div>
  );
}
