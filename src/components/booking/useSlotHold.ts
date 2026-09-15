"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBookingSessionToken, SLOT_HOLD_MINUTES } from "@/lib/booking-session";
import type { SlotOption } from "./TimeSlotGrid";

type HoldState = {
  expiresAt: Date;
  slot: SlotOption;
} | null;

export function useSlotHold(input: {
  businessId: string;
  serviceId: string | null;
  staffId: string | null;
  locationId?: string | null;
  enabled?: boolean;
  formatHoldLabel?: (minutes: number, seconds: number) => string;
}) {
  const [hold, setHold] = useState<HoldState>(null);
  const [slotUnavailable, setSlotUnavailable] = useState(false);
  const [holding, setHolding] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSessionToken(getBookingSessionToken());
  }, []);

  useEffect(() => {
    if (!hold) return;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [hold]);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const releaseHold = useCallback(async () => {
    clearPoll();
    if (!sessionToken) {
      setHold(null);
      return;
    }
    try {
      const query = new URLSearchParams({
        businessId: input.businessId,
        sessionToken,
      });
      await fetch(`/api/slot-reservations?${query.toString()}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    setHold(null);
    setSlotUnavailable(false);
  }, [clearPoll, input.businessId, sessionToken]);

  const reserveSlot = useCallback(
    async (slot: SlotOption) => {
      if (!input.enabled || !input.serviceId) return false;
      const staffId = slot.staffId ?? input.staffId;
      if (!staffId) return false;

      setHolding(true);
      setSlotUnavailable(false);
      const token = sessionToken || getBookingSessionToken();
      setSessionToken(token);

      try {
        const res = await fetch("/api/slot-reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId: input.businessId,
            staffId,
            serviceId: input.serviceId,
            locationId: input.locationId,
            startUtc: slot.startUtc,
            endUtc: slot.endUtc,
            sessionToken: token,
          }),
        });

        if (!res.ok) {
          setSlotUnavailable(true);
          setHold(null);
          return false;
        }

        const data = await res.json();
        setHold({ slot, expiresAt: new Date(data.expiresAt) });
        setSlotUnavailable(false);
        return true;
      } catch {
        setSlotUnavailable(true);
        return false;
      } finally {
        setHolding(false);
      }
    },
    [
      input.businessId,
      input.enabled,
      input.locationId,
      input.serviceId,
      input.staffId,
      sessionToken,
    ],
  );

  useEffect(() => {
    if (!hold || !sessionToken) {
      clearPoll();
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/slot-reservations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken }),
        });
        if (!res.ok) {
          setSlotUnavailable(true);
          setHold(null);
          return;
        }
        const data = await res.json();
        setHold((prev) =>
          prev ? { ...prev, expiresAt: new Date(data.expiresAt) } : prev,
        );
      } catch {
        // keep existing hold on transient errors
      }
    }, 30_000);

    return clearPoll;
  }, [hold, sessionToken, clearPoll]);

  const secondsRemaining = hold
    ? Math.max(0, Math.floor((hold.expiresAt.getTime() - now) / 1000))
    : 0;

  useEffect(() => {
    if (hold && secondsRemaining === 0) {
      // Hold expired: release server-side so the slot frees up, clear local
      // state so the user can pick again instead of deadlocking on
      // "pick another time" while still holding.
      void releaseHold();
    }
  }, [hold, secondsRemaining, releaseHold]);

  const holdLabel =
    hold && secondsRemaining > 0
      ? input.formatHoldLabel
        ? input.formatHoldLabel(
            Math.floor(secondsRemaining / 60),
            secondsRemaining % 60,
          )
        : `Holding this slot for ${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}`
      : null;

  return {
    hold,
    holdLabel,
    holding,
    slotUnavailable,
    reserveSlot,
    releaseHold,
    sessionToken,
    holdMinutes: SLOT_HOLD_MINUTES,
  };
}
