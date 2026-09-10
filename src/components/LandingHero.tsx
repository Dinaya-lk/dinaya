import Link from "next/link";
import dynamic from "next/dynamic";
import { CTAPrimaryButton } from "@/components/cta-primary-button";
import { ProductMockupSkeleton } from "@/components/ProductMockupSkeleton";
import { Icon } from "@/components/ui/Icon";
import { LANDING_LIVE_DEMO_PATH } from "@/lib/landing-demo";
import { MARKETING_CTA_HERO } from "@/lib/marketing-copy";

const ProductMockup = dynamic(() => import("@/components/ProductMockup"), {
  loading: () => <ProductMockupSkeleton />,
});

const trustSignals = [
  "14-day free trial",
  "LKR pricing · PayHere",
  "No commission on bookings",
] as const;

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,hsl(220_82%_53%/0.14),transparent_55%)] dark:bg-[radial-gradient(120%_80%_at_50%_-10%,hsl(220_82%_53%/0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(220_30%_98%)_0%,transparent_42%,hsl(0_0%_100%)_100%)] dark:bg-[linear-gradient(180deg,hsl(240_6%_7%)_0%,transparent_45%,hsl(240_6%_7%)_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(220 20% 40% / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(220 20% 40% / 0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 70% 55% at 50% 20%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 55% at 50% 20%, black, transparent)",
          }}
        />
      </div>

      <div className="mx-auto max-w-4xl px-6 public-page-offset-lg pb-8 text-center md:pb-10">
        <p className="landing-reveal font-cal text-4xl tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Dinaya
        </p>

        <h1 className="landing-reveal landing-reveal-delay-1 font-cal mt-5 text-3xl tracking-tight text-balance sm:text-4xl md:text-5xl">
          Stop the WhatsApp chaos.
          <br />
          Get a real booking page in 5 minutes.
        </h1>

        <p className="landing-reveal landing-reveal-delay-2 mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-pretty sm:text-xl">
          Share one link on Instagram or WhatsApp. Clients pick a time, pay a deposit,
          and you get notified — made for Sri Lankan service businesses.
        </p>

        <div className="landing-reveal landing-reveal-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
          <CTAPrimaryButton>{MARKETING_CTA_HERO}</CTAPrimaryButton>
          <Link
            href={LANDING_LIVE_DEMO_PATH}
            className="inline-flex items-center gap-1.5 px-2 py-3.5 text-sm font-medium text-foreground/80 transition-colors duration-150 hover:text-foreground"
          >
            Try a live booking page
            <Icon name="box-arrow-up-right" className="text-sm" />
          </Link>
        </div>

        <p className="landing-reveal landing-reveal-delay-4 mt-6 text-sm text-muted-foreground">
          {trustSignals.join(" · ")}
        </p>
      </div>

      <div id="demo" className="landing-reveal landing-reveal-delay-5">
        <ProductMockup variant="hero" />
      </div>
    </section>
  );
}
