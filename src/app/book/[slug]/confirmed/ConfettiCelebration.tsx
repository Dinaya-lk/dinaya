"use client";

import { useEffect, useRef } from "react";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const SIDE_CANNON_COLORS = ["#2563eb", "#7c3aed", "#f59e0b", "#10b981"];

/** Fires once when a booking is confirmed. Skips entirely under prefers-reduced-motion. */
export default function ConfettiCelebration() {
  const confettiRef = useRef<ConfettiRef>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const end = Date.now() + 2500;
    let frameId: number;

    (function frame() {
      if (Date.now() > end) return;

      confettiRef.current?.fire({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: SIDE_CANNON_COLORS,
      });
      confettiRef.current?.fire({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: SIDE_CANNON_COLORS,
      });

      frameId = requestAnimationFrame(frame);
    })();

    return () => cancelAnimationFrame(frameId);
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <Confetti
      ref={confettiRef}
      manualstart
      // No worker: the app's CSP doesn't allow blob: workers, and this is a
      // short, low-volume burst that doesn't need one.
      globalOptions={{ useWorker: false, resize: true }}
      className="pointer-events-none fixed inset-0 z-50 size-full"
      aria-hidden="true"
    />
  );
}
