"use client";

import { useEffect, useLayoutEffect, useState, useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { LogoIcon } from "@/components/Logo";
import { useNav } from "@/context/NavContext";
import { GlassButton } from "@/components/ui/glass-button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MARKETING_CTA_NAV, MARKETING_CTA_PRIMARY } from "@/lib/marketing-copy";

const WEBP_DISPLACEMENT_MAP = (GlassButton as typeof GlassButton & { displacementMap: string }).displacementMap;

const ENERGY:   [number, number, number, number] = [0.32, 0.72, 0, 1];
const BACK_OUT: [number, number, number, number] = [0.175, 0.885, 0.32, 1.275];

const NAV_LINKS = [
  { label: "Features",  href: "/features"  },
  { label: "Pricing",   href: "/pricing"   },
  { label: "Solutions", href: "/solutions" },
  { label: "Directory", href: "/discover", matchPrefix: true },
];

const NAV_LINKS_SECONDARY = [
  { label: "Docs",      href: "/docs"      },
  { label: "Help",      href: "/help"      },
  { label: "Our Story", href: "/our-story" },
  { label: "Contact",   href: "/contact"   },
];

const QUICK_LINKS = [
  { label: "Privacy Policy ↗", href: "/legal/privacy" },
  { label: "Terms ↗",          href: "/legal/terms"   },
  { label: "Refund Policy ↗",  href: "/legal/refund"  },
];

function isNavLinkActive(pathname: string, item: { href: string; matchPrefix?: boolean }) {
  return item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;
}

export function UnderlayNav() {
  const { isOpen, toggle, close } = useNav();
  const pathname = usePathname();
  const filterId = useId().replace(/:/g, "");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  useEffect(() => {
    document.documentElement.classList.toggle("nav-open", isOpen);
    return () => { document.documentElement.classList.remove("nav-open"); };
  }, [isOpen]);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [layout, setLayout] = useState({
    open: 1152, closed: 768, isMobile: false, fullWidth: 390,
  });
  useLayoutEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const isMobile = w < 640;
      setLayout({
        open:      isMobile ? w - 24 : Math.min(1152, w - 48),
        closed:    isMobile ? w - 16 : Math.min(768, w - 48),
        isMobile,
        fullWidth: w,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const mobileOpen = isOpen && layout.isMobile;

  return (
    <>
      {/* SVG liquid glass filter */}
      <svg className="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <filter id={`liquid-glass-nav-${filterId}`} primitiveUnits="objectBoundingBox">
          <feImage result="map" width="100%" height="100%" x="0" y="0" href={WEBP_DISPLACEMENT_MAP} preserveAspectRatio="none" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur" />
          <feDisplacementMap in="blur" in2="map" scale="0.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* Backdrop */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-99"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* ── Expanding pill nav ───────────────────────────────────────────── */}
      <motion.header
        className="fixed z-100 text-gray-900 dark:text-gray-100 overflow-hidden"
        initial={false}
        animate={{
          top:          mobileOpen ? 0 : 12,
          left:         mobileOpen ? 0 : "50%",
          x:            mobileOpen ? 0 : "-50%",
          width:        isOpen ? (layout.isMobile ? layout.fullWidth : layout.open) : layout.closed,
          borderRadius: mobileOpen ? "0px 0px 1rem 1rem" : isOpen ? "1.125rem" : "0.875rem",
        }}
        transition={{
          top:          { duration: mobileOpen ? 0.1 : 0.5,  ease: ENERGY, delay: isOpen ? 0 : 0.45 },
          left:         { duration: mobileOpen ? 0.1 : 0.5,  ease: ENERGY, delay: isOpen ? 0 : 0.45 },
          x:            { duration: mobileOpen ? 0.1 : 0.5,  ease: ENERGY, delay: isOpen ? 0 : 0.45 },
          width:        { duration: mobileOpen ? 0.12 : (isOpen ? 0.6 : 0.55), ease: ENERGY, delay: isOpen ? 0 : 0.45 },
          borderRadius: { duration: mobileOpen ? 0.12 : (isOpen ? 0.6 : 0.55), ease: ENERGY, delay: isOpen ? 0 : 0.45 },
        }}
      >
        {/* Glass background */}
        <span
          className="absolute inset-0 -z-10 rounded-[inherit] pointer-events-none"
          style={{
            backgroundColor: "var(--nav-glass-bg)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            boxShadow: `
              inset 0 0 0 1px var(--nav-glass-inset-light),
              inset 1.8px 3px 0px -2px var(--nav-glass-inset-light),
              inset -2px -2px 0px -2px var(--nav-glass-inset-mid),
              inset -3px -8px 1px -6px var(--nav-glass-inset-soft),
              inset -0.3px -1px 4px 0px rgba(0, 0, 0, 0.06),
              inset -1.5px 2.5px 0px -2px rgba(0, 0, 0, 0.10),
              inset 0px 3px 4px -2px rgba(0, 0, 0, 0.10),
              inset 2px -6.5px 1px -4px rgba(0, 0, 0, 0.05),
              0px 1px 5px 0px rgba(0, 0, 0, 0.08),
              0px 8px 32px 0px var(--nav-glass-shadow-outer)
            `,
          }}
        />

        {/* Always-visible pill bar */}
        <div className="flex items-center justify-between h-15 pl-5 sm:pl-6 pr-2 sm:pr-2">

          {/* Menu / Close toggle */}
          <button
            onClick={toggle}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="flex items-center gap-2.5 -m-2 rounded-lg p-2 select-none relative z-10 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
          >
            <span className="flex flex-col gap-[0.3em] w-4" aria-hidden="true">
              <motion.span
                className="h-[1.5px] w-full bg-gray-900 dark:bg-gray-100 rounded-full origin-center"
                animate={isOpen ? { y: "0.265em", rotate: 45 } : { y: 0, rotate: 0 }}
                transition={{ duration: 0.5, ease: BACK_OUT }}
              />
              <motion.span
                className="h-[1.5px] w-full bg-gray-900 dark:bg-gray-100 rounded-full origin-center"
                animate={isOpen ? { y: "-0.265em", rotate: -45 } : { y: 0, rotate: 0 }}
                transition={{ duration: 0.5, ease: BACK_OUT }}
              />
            </span>
            <span className="text-base font-medium text-gray-900 dark:text-gray-100">{isOpen ? "Close" : "Menu"}</span>
          </button>

          {/* Logo — threshold swap: text ↔ icon */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            <motion.div
              className="absolute"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: (scrolled && !isOpen) ? 0 : 1, y: (scrolled && !isOpen) ? 8 : 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <Link href="/" className="font-cal text-xl text-gray-900 dark:text-gray-100 leading-none whitespace-nowrap">
                Dinaya.lk
              </Link>
            </motion.div>
            <motion.div
              className="absolute text-gray-900 dark:text-gray-100"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: (scrolled && !isOpen) ? 1 : 0, y: (scrolled && !isOpen) ? 0 : -8 }}
              transition={{ duration: 0.25, ease: "easeInOut", delay: (scrolled && !isOpen) ? 0.1 : 0 }}
            >
              <LogoIcon size="md" />
            </motion.div>
            <span className="invisible font-cal text-xl">Dinaya.lk</span>
          </div>

          {/* Auth CTAs — Get started unmounts on desktop while the menu is open (the expanded panel repeats it);
              Log in and the theme toggle glide right into the space it leaves behind. */}
          <motion.div layout transition={{ type: "spring", stiffness: 180, damping: 26, mass: 1 }} className="flex items-center gap-2">
            <motion.div layout transition={{ type: "spring", stiffness: 180, damping: 26, mass: 1 }}>
              <ThemeToggle className="hidden sm:inline-flex" />
            </motion.div>
            <motion.div layout transition={{ type: "spring", stiffness: 180, damping: 26, mass: 1 }}>
              <Link
                href="/auth/signin"
                className="hidden sm:block text-base text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors
                           px-4 py-2 rounded-full border border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-neutral-500"
              >
                Log in
              </Link>
            </motion.div>
            <AnimatePresence initial={false}>
              {!(isOpen && !layout.isMobile) && (
                <motion.div
                  key="get-started"
                  layout
                  style={{ overflow: "hidden" }}
                  initial={{ opacity: 0, width: 0 }}
                  animate={{
                    opacity: 1,
                    width: "auto",
                    transition: { type: "spring", stiffness: 180, damping: 26, mass: 1 },
                  }}
                  exit={{ opacity: 0, width: 0, transition: { duration: 0.32, ease: "easeInOut" } }}
                >
                  <Link
                    href="/register"
                    className="block text-base font-semibold bg-primary text-white
                               px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    {MARKETING_CTA_NAV}
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ── Expandable menu content ────────────────────────────────────── */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: isOpen ? "auto" : 0 }}
          transition={{
            duration: isOpen ? (layout.isMobile ? 0.55 : 0.65) : (layout.isMobile ? 0.4 : 0.48),
            ease: ENERGY,
            delay: isOpen ? (layout.isMobile ? 0.1 : 0.28) : 0,
          }}
          style={{ overflow: "hidden" }}
          aria-hidden={!isOpen}
        >
          {layout.isMobile ? (
            /* ── Mobile menu ── */
            <>
              <div className="mx-5 h-px bg-gray-200 dark:bg-neutral-700" />
              <div className="px-5 pt-5 pb-6 flex flex-col gap-6">

                {/* Nav links */}
                <div>
                  <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-gray-400 dark:text-gray-500 uppercase mb-4">
                    Explore
                  </p>
                  <ul className="flex flex-col m-0 p-0 list-none">
                    {NAV_LINKS.map((item, i) => (
                      <li key={item.label}>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                          transition={{ delay: isOpen ? 0.18 + i * 0.05 : 0, duration: 0.5, ease: "easeOut" }}
                        >
                          <Link
                            href={item.href}
                            onClick={close}
                            aria-current={isNavLinkActive(pathname, item) ? "page" : undefined}
                            className={[
                              "block py-2 text-[clamp(1.6rem,8vw,2.2rem)] font-medium",
                              "tracking-[-0.02em] leading-none transition-colors",
                              isNavLinkActive(pathname, item) ? "text-primary" : "text-gray-900 dark:text-gray-100 hover:text-gray-400 dark:hover:text-gray-500",
                            ].join(" ")}
                          >
                            {item.label}
                          </Link>
                        </motion.div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                    {NAV_LINKS_SECONDARY.map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                        transition={{ delay: isOpen ? 0.4 + i * 0.05 : 0, duration: 0.5, ease: "easeOut" }}
                      >
                        <Link
                          href={item.href}
                          onClick={close}
                          aria-current={isNavLinkActive(pathname, item) ? "page" : undefined}
                          className={[
                            "text-sm font-medium transition-colors",
                            isNavLinkActive(pathname, item) ? "text-primary" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
                          ].join(" ")}
                        >
                          {item.label}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* CTA buttons */}
                <motion.div
                  className="flex flex-col gap-2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                  transition={{ delay: isOpen ? 0.52 : 0, duration: 0.35, ease: "easeOut" }}
                >
                  <div className="flex justify-center pb-1 sm:hidden">
                    <ThemeToggle variant="pill" />
                  </div>
                  <Link
                    href="/auth/signin"
                    onClick={close}
                    className="block text-center py-3.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={close}
                    className="block text-center py-3.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    {MARKETING_CTA_PRIMARY} →
                  </Link>
                </motion.div>

                {/* Legal */}
                <motion.div
                  className="flex gap-5 justify-center"
                  initial={{ opacity: 0 }}
                  animate={isOpen ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: isOpen ? 0.58 : 0, duration: 0.3 }}
                >
                  {QUICK_LINKS.map((l) => (
                    <Link key={l.label} href={l.href} onClick={close} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
                      {l.label}
                    </Link>
                  ))}
                </motion.div>

              </div>
            </>
          ) : (
            /* ── Desktop menu (original layout) ── */
            <div style={{ width: layout.open }}>
              <div className="mx-5 h-px bg-gray-200 dark:bg-neutral-700" />
              <div className="px-5 pt-5 pb-6 grid grid-cols-[auto_1fr_auto_auto] gap-8">

                {/* Column 1 — main nav links */}
                <div>
                  <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-gray-400 dark:text-gray-500 uppercase mb-4">
                    Explore
                  </p>
                  <ul className="flex flex-col m-0 p-0 list-none">
                    {NAV_LINKS.map((item, i) => (
                      <li key={item.label}>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                          transition={{ delay: isOpen ? 0.35 + i * 0.06 : 0, duration: 0.5, ease: "easeOut" }}
                        >
                          <Link
                            href={item.href}
                            onClick={close}
                            aria-current={isNavLinkActive(pathname, item) ? "page" : undefined}
                            className={[
                              "block py-2 text-[clamp(1.15rem,2.5vw,1.5rem)] font-medium",
                              "tracking-[-0.02em] leading-none transition-colors",
                              isNavLinkActive(pathname, item) ? "text-primary" : "text-gray-900 dark:text-gray-100 hover:text-gray-400 dark:hover:text-gray-500",
                            ].join(" ")}
                          >
                            {item.label}
                          </Link>
                        </motion.div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-col gap-2">
                    {NAV_LINKS_SECONDARY.map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                        transition={{ delay: isOpen ? 0.35 + (NAV_LINKS.length + i) * 0.06 : 0, duration: 0.5, ease: "easeOut" }}
                      >
                        <Link
                          href={item.href}
                          onClick={close}
                          aria-current={isNavLinkActive(pathname, item) ? "page" : undefined}
                          className={[
                            "text-sm font-medium transition-colors hover:underline underline-offset-4 decoration-gray-300 dark:decoration-neutral-600",
                            isNavLinkActive(pathname, item) ? "text-primary" : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
                          ].join(" ")}
                        >
                          {item.label}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Column 2 — Popular Resources (Fills middle space) */}
                <div className="hidden lg:block border-l border-gray-100 dark:border-neutral-800 pl-8 min-w-60">
                  <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-gray-400 dark:text-gray-500 uppercase mb-4">
                    Popular Guides
                  </p>
                  <div className="flex flex-col gap-6 mt-2">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                      transition={{ delay: isOpen ? 0.40 : 0, duration: 0.5, ease: "easeOut" }}
                    >
                      <Link href="/help" onClick={close} className="group flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                          Setting up AI Hub
                        </span>
                        <span className="text-[0.8rem] text-gray-500 dark:text-gray-400 leading-snug">
                          Automate your schedule in 5 minutes with our smart booking rules.
                        </span>
                      </Link>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                      transition={{ delay: isOpen ? 0.44 : 0, duration: 0.5, ease: "easeOut" }}
                    >
                      <Link href="/help" onClick={close} className="group flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                          Google Calendar Sync
                        </span>
                        <span className="text-[0.8rem] text-gray-500 dark:text-gray-400 leading-snug">
                          Keep your personal events strictly private while avoiding double bookings.
                        </span>
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                      transition={{ delay: isOpen ? 0.48 : 0, duration: 0.5, ease: "easeOut" }}
                    >
                      <Link href="/help" onClick={close} className="group flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                          Client Booking Tips
                        </span>
                        <span className="text-[0.8rem] text-gray-500 dark:text-gray-400 leading-snug">
                          Best practices for reducing no-shows and maximizing attendance.
                        </span>
                      </Link>
                    </motion.div>
                  </div>
                </div>

                {/* Column 3 — legal */}
                <div className="flex flex-col gap-6 min-w-32 pl-8 border-l border-gray-100 dark:border-neutral-800">
                  <SubCol heading="Legal"   items={QUICK_LINKS}   isOpen={isOpen} onClose={close} baseDelay={0.42} />
                </div>

                {/* Column 4 — original CTA card */}
                <motion.div
                  className="w-52 rounded-xl bg-gray-900/5 dark:bg-white/5 border border-gray-200 dark:border-neutral-800 p-5 flex flex-col justify-between gap-4"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={isOpen ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
                  transition={{ delay: isOpen ? 0.48 : 0, duration: 0.55, ease: ENERGY }}
                >
                  <div className="flex flex-col gap-2">
                    <span className="self-start text-[0.6875rem] font-bold tracking-widest uppercase bg-primary text-white px-2.5 py-1 rounded-full">
                      {MARKETING_CTA_NAV}
                    </span>
                    <p className="text-gray-900 dark:text-gray-100 font-medium text-base leading-snug">
                      Launch your booking page
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                      Set up services, share your link, and let clients book and pay without WhatsApp back-and-forth.
                    </p>
                  </div>
                  <Link
                    href="/register"
                    onClick={close}
                    className="block text-center text-sm font-semibold bg-primary text-white py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {MARKETING_CTA_PRIMARY} →
                  </Link>
                </motion.div>

              </div>
            </div>
          )}
        </motion.div>
      </motion.header>
    </>
  );
}

function SubCol({
  heading, items, isOpen, onClose, baseDelay,
}: {
  heading: string;
  items: { label: string; href: string }[];
  isOpen: boolean;
  onClose: () => void;
  baseDelay: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-gray-400 dark:text-gray-500 uppercase">
        {heading}
      </p>
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ delay: isOpen ? baseDelay + i * 0.05 : 0, duration: 0.45, ease: "easeOut" }}
        >
          <Link href={item.href} onClick={onClose} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            {item.label}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
