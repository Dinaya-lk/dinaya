"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { docsEase } from "@/lib/docs/design-tokens";
import { DocsMockupCapture } from "@/components/docs/DocsMockupCapture";

const HERO_SHOTS = ["dashboard-overview", "dashboard-services", "dashboard-marketing"] as const;

export function DocsHeroPreview() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_SHOTS.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const mockupId = HERO_SHOTS[reduceMotion ? 0 : index];

  return (
    <div className="relative mx-auto mt-10 max-w-3xl">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mockupId}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.35, ease: docsEase }}
        >
          <DocsMockupCapture mockupId={mockupId} staged />
        </motion.div>
      </AnimatePresence>
      {!reduceMotion ? (
        <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
          {HERO_SHOTS.map((id, i) => (
            <span
              key={id}
              className={`h-1 rounded-full transition-[width,background-color] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                i === index ? "w-5 bg-foreground/50" : "w-1 bg-foreground/12"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
