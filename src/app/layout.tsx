import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import { ChunkLoadRecovery } from "@/components/ChunkLoadRecovery";
import { BookingPwa } from "@/components/booking/BookingPwa";
import { NavProvider } from "@/context/NavContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { siteViewport } from "@/lib/viewport-theme";
import "./globals.css";

const calSans = localFont({
  src: "../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dinaya — Booking pages for Sri Lankan service businesses",
  description:
    "Stop WhatsApp booking chaos. Get a real booking page in 5 minutes — PayHere deposits, reminders, and LKR pricing. 14-day free trial, no card required.",
};

export const viewport: Viewport = siteViewport;

const enableVercelAnalytics = process.env.VERCEL === "1";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className={`${calSans.variable} font-sans antialiased`}>
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-hidden"
          >
            Skip to main content
          </a>
          <NavProvider>
            <BookingPwa />
            <main id="main-content">
              {children}
            </main>
          </NavProvider>
          <ChunkLoadRecovery />
          {enableVercelAnalytics ? <Analytics /> : null}
          {enableVercelAnalytics ? <SpeedInsights /> : null}
          <GoogleAnalytics />
          <MicrosoftClarity />
        </ThemeProvider>
      </body>
    </html>
  );
}
