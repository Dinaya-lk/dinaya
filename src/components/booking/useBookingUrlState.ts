"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type BookingUrlState = {
  date?: string;
  slot?: string;
  staffId?: string;
  variantId?: string;
  dealId?: string;
  name?: string;
  email?: string;
  phone?: string;
  embed?: boolean;
  hideGallery?: boolean;
};

export function useBookingUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo<BookingUrlState>(() => {
    const embed = searchParams.get("embed");
    const hideGallery = searchParams.get("hideGallery");
    return {
      date: searchParams.get("date") ?? undefined,
      slot: searchParams.get("slot") ?? undefined,
      staffId: searchParams.get("staff") ?? undefined,
      variantId: searchParams.get("variantId") ?? undefined,
      dealId: searchParams.get("dealId") ?? undefined,
      name: searchParams.get("name") ?? undefined,
      email: searchParams.get("email") ?? undefined,
      phone: searchParams.get("phone") ?? undefined,
      embed: embed === "1" || embed === "true",
      hideGallery: hideGallery === "1" || hideGallery === "true",
    };
  }, [searchParams]);

  const setParams = useCallback(
    (updates: Partial<BookingUrlState>, options?: { replace?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());

      const apply = (key: string, value: string | undefined, paramKey = key) => {
        if (value === undefined) return;
        if (value === "") params.delete(paramKey);
        else params.set(paramKey, value);
      };

      apply("date", updates.date);
      apply("slot", updates.slot);
      apply("staffId", updates.staffId, "staff");
      apply("variantId", updates.variantId);
      apply("dealId", updates.dealId);
      // Contact fields are intentionally not synced to the URL (PII / referrer leakage).

      if (updates.embed !== undefined) {
        if (updates.embed) params.set("embed", "1");
        else params.delete("embed");
      }
      if (updates.hideGallery !== undefined) {
        if (updates.hideGallery) params.set("hideGallery", "1");
        else params.delete("hideGallery");
      }

      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (options?.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { state, setParams };
}

export function useBookingUrlSync(input: {
  date: string;
  slotStartUtc: string;
  staffId: string | null;
  variantId: string | null;
  dealId: string | null;
  enabled?: boolean;
  setParams: (updates: Partial<BookingUrlState>, options?: { replace?: boolean }) => void;
}) {
  const { setParams } = input;

  useEffect(() => {
    if (input.enabled === false) return;
    setParams(
      {
        date: input.date || "",
        slot: input.slotStartUtc || "",
        staffId: input.staffId || "",
        variantId: input.variantId || "",
        dealId: input.dealId || "",
      },
      { replace: true },
    );
    // setParams is intentionally omitted: its identity changes on every URL update
    // (it closes over searchParams from useSearchParams), which would re-trigger this
    // effect and loop router.replace forever. Only the actual booking state should re-sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.date, input.slotStartUtc, input.staffId, input.variantId, input.dealId, input.enabled]);
}

/** Remove contact PII from the URL after embed prefill; sessionStorage handles recovery. */
export function useStripBookingContactFromUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    for (const key of ["name", "email", "phone"]) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (!changed) return;
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);
}
