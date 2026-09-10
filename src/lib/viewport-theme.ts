import type { Viewport } from "next";

/** iOS Safari status bar + overscroll tint for marketing/dashboard surfaces. */
export const siteViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

/** Booking flows use a slightly warmer light gray page background. */
export const bookingViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  // BookingThemeToggle positions itself with env(safe-area-inset-top), which
  // only returns a real value once the page opts into drawing under the
  // notch/Dynamic Island — otherwise it's always 0 and the inset is a no-op.
  viewportFit: "cover",
};
