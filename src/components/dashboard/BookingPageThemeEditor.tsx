"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrandColorPicker } from "@/components/dashboard/BrandColorPicker";
import { DashboardField } from "@/components/dashboard/DashboardField";
import { ImageUploadField } from "@/components/dashboard/ImageUploadField";
import { ThemeEditorLockedSection } from "@/components/dashboard/ThemeEditorProGate";
import { ThemePresetCards } from "@/components/dashboard/ThemePresetCards";
import { ThemeStyleModeToggle } from "@/components/dashboard/ThemeStyleModeToggle";
import { Icon } from "@/components/ui/Icon";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { buildThemeEditorPreviewUrl, type ThemeEditorPreviewState } from "@/lib/booking/theme-editor-preview";
import {
  BOOKING_THEME_PRESETS,
  accentContrastWarning,
  contrastRatio,
  tintAccentBackground,
  type BookingHeroOverlay,
  type BookingPageBackground,
  type BookingPanelBackground,
  type BookingThemePreset,
} from "@/lib/booking-theme";
import type { AccentColorOption } from "@/lib/color/harmonious-palette";
import { extractAccentColorOptions } from "@/lib/color/extract-logo-colors";
import { applySolidBookingTheme, isSolidBookingTheme } from "@/lib/color/solid-theme";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import {
  dashboardErrorAlertClass,
  dashboardFilterPillClass,
  dashboardInputClass,
  dashboardPrimaryActionClass,
  dashboardSectionClass,
} from "@/lib/dashboard-ui";
import { isOptimizableRemoteImage } from "@/lib/utils";

type ThemeBusiness = {
  accentColor: string | null;
  bookingPageBackground: string;
  bookingPageBackgroundColor: string | null;
  bookingHeroOverlay: string;
  bookingHeroOverlayOpacity: number;
  bookingThemePreset: string | null;
  bookingPanelBackground: string;
  canUseBookingPageTheme: boolean;
  canCustomizeBookingPage: boolean;
  customDomain: string | null;
  customDomainVerified: boolean;
  description: string | null;
  galleryImages: string[] | null;
  hideDinayaBranding: boolean;
  logoUrl: string | null;
  name: string;
  slug: string;
};

interface Props {
  business: ThemeBusiness;
  onPreviewChange: (previewSrc: string) => void;
}

const HERO_OVERLAY_OPTIONS: { value: BookingHeroOverlay; label: string }[] = [
  { value: "light", label: "Light fade" },
  { value: "dark", label: "Dark fade" },
  { value: "brand", label: "Brand tint" },
  { value: "none", label: "None" },
];

const PAGE_BACKGROUND_OPTIONS: { value: BookingPageBackground; label: string }[] = [
  { value: "white", label: "White" },
  { value: "grouped", label: "Soft gray" },
  { value: "custom", label: "Custom color" },
  { value: "accent", label: "Accent wash" },
];

const PANEL_BACKGROUND_OPTIONS: { value: BookingPanelBackground; label: string }[] = [
  { value: "white", label: "White card" },
  { value: "accent", label: "Brand accent panel" },
];

function sliderValue(value: number | readonly number[]): number {
  if (typeof value === "number") return value;
  return value[0] ?? 0;
}

function GalleryThumb({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="size-full bg-muted" aria-hidden="true" />;
  }
  return (
    <Image
      src={url}
      alt=""
      fill
      className="object-cover"
      sizes="200px"
      unoptimized={!isOptimizableRemoteImage(url)}
      onError={() => setFailed(true)}
    />
  );
}

function contrastBackground(form: ThemeEditorPreviewState): string {
  if (form.bookingPanelBackground === "accent") {
    return tintAccentBackground(form.accentColor, 0.48);
  }
  if (form.bookingPageBackground === "custom") return form.bookingPageBackgroundColor;
  if (form.bookingPageBackground === "grouped") return "#f2f2f7";
  if (form.bookingPageBackground === "accent") return tintAccentBackground(form.accentColor, 0.38);
  return "#ffffff";
}

export function BookingPageThemeEditor({ business, onPreviewChange }: Props) {
  const footerSwitchId = useId();
  const contrastHintId = useId();

  const [form, setForm] = useState({
    accentColor: business.accentColor ?? "#2563eb",
    bookingPageBackground: (business.bookingPageBackground || "white") as BookingPageBackground,
    bookingPageBackgroundColor: business.bookingPageBackgroundColor ?? "#f2f2f7",
    bookingPanelBackground: (business.bookingPanelBackground || "white") as BookingPanelBackground,
    bookingHeroOverlay: (business.bookingHeroOverlay || "light") as BookingHeroOverlay,
    bookingHeroOverlayOpacity: business.bookingHeroOverlayOpacity ?? 60,
    bookingThemePreset: (business.bookingThemePreset ?? "custom") as BookingThemePreset,
    hideDinayaBranding: business.hideDinayaBranding,
  });
  const [logoUrl, setLogoUrl] = useState(business.logoUrl ?? "");
  const [heroBannerUrl, setHeroBannerUrl] = useState(business.galleryImages?.[0] ?? "");
  const [galleryRest, setGalleryRest] = useState<string[]>(business.galleryImages?.slice(1) ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [logoColorOptions, setLogoColorOptions] = useState<AccentColorOption[]>([]);
  const [logoColorsLoading, setLogoColorsLoading] = useState(false);
  const [overlayDraft, setOverlayDraft] = useState(form.bookingHeroOverlayOpacity);

  const galleryImageCount = [heroBannerUrl.trim(), ...galleryRest].filter(Boolean).length;
  const galleryAtLimit = galleryImageCount >= 12;
  const solidTheme = isSolidBookingTheme(form.bookingPageBackground, form.bookingPanelBackground);

  const previewState = useMemo<ThemeEditorPreviewState>(
    () => ({
      accentColor: form.accentColor,
      bookingPageBackground: form.bookingPageBackground,
      bookingPageBackgroundColor: form.bookingPageBackgroundColor,
      bookingPanelBackground: form.bookingPanelBackground,
      bookingHeroOverlay: form.bookingHeroOverlay,
      bookingHeroOverlayOpacity: form.bookingHeroOverlayOpacity,
      logoUrl,
      heroBannerUrl,
      galleryRest,
      hideDinayaBranding: form.hideDinayaBranding,
    }),
    [form, galleryRest, heroBannerUrl, logoUrl],
  );

  const contrastWarning = accentContrastWarning(form.accentColor, contrastBackground(previewState));
  const contrastValue = contrastRatio(form.accentColor, contrastBackground(previewState));

  const pushPreview = useCallback(
    (state: ThemeEditorPreviewState) => {
      onPreviewChange(buildThemeEditorPreviewUrl(business.slug, state));
    },
    [business.slug, onPreviewChange],
  );

  const debouncedPushPreview = useDebouncedCallback(pushPreview, 200);

  useEffect(() => {
    pushPreview(previewState);
  }, [previewState, pushPreview]);

  const loadLogoColors = useCallback(async (source: Blob | string) => {
    setLogoColorsLoading(true);
    try {
      const options = await extractAccentColorOptions(source);
      setLogoColorOptions(options);
    } catch {
      setLogoColorOptions([]);
    } finally {
      setLogoColorsLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = logoUrl.trim();
    if (!trimmed) {
      setLogoColorOptions([]);
      return;
    }
    void loadLogoColors(trimmed);
  }, [loadLogoColors, logoUrl]);

  function updatePreview(next: typeof form) {
    const state: ThemeEditorPreviewState = {
      accentColor: next.accentColor,
      bookingPageBackground: next.bookingPageBackground,
      bookingPageBackgroundColor: next.bookingPageBackgroundColor,
      bookingPanelBackground: next.bookingPanelBackground,
      bookingHeroOverlay: next.bookingHeroOverlay,
      bookingHeroOverlayOpacity: next.bookingHeroOverlayOpacity,
      logoUrl,
      heroBannerUrl,
      galleryRest,
      hideDinayaBranding: next.hideDinayaBranding,
    };
    debouncedPushPreview(state);
  }

  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    const next = { ...form, [key]: value, bookingThemePreset: "custom" as const };
    setForm(next);
    updatePreview(next);
  }

  function applyPreset(preset: Exclude<BookingThemePreset, "custom">) {
    const values = BOOKING_THEME_PRESETS[preset];
    const next = {
      ...form,
      accentColor: values.accentColor,
      bookingPageBackground: values.pageBackground,
      bookingPageBackgroundColor: values.pageBackgroundColor ?? "#f2f2f7",
      bookingPanelBackground: values.panelBackground ?? "white",
      bookingHeroOverlay: values.heroOverlay,
      bookingHeroOverlayOpacity: values.heroOverlayOpacity,
      bookingThemePreset: preset,
    };
    setOverlayDraft(next.bookingHeroOverlayOpacity);
    setForm(next);
    updatePreview(next);
  }

  function setSolidTheme(enabled: boolean) {
    const surfaces = applySolidBookingTheme(enabled);
    const next = {
      ...form,
      ...surfaces,
      bookingThemePreset: "custom" as const,
    };
    setForm(next);
    updatePreview(next);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const galleryImages = [heroBannerUrl.trim(), ...galleryRest].filter(Boolean);
    const payload = {
      accentColor: form.accentColor,
      bookingPageBackground: form.bookingPageBackground,
      bookingPageBackgroundColor:
        form.bookingPageBackground === "custom" ? form.bookingPageBackgroundColor : null,
      bookingPanelBackground: form.bookingPanelBackground,
      bookingHeroOverlay: form.bookingHeroOverlay,
      bookingHeroOverlayOpacity: form.bookingHeroOverlayOpacity,
      bookingThemePreset: form.bookingThemePreset,
      hideDinayaBranding: form.hideDinayaBranding,
      logoUrl: logoUrl.trim() || null,
      galleryImages,
      name: business.name,
      description: business.description,
    };

    const res = await fetch("/api/dashboard/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error saving.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  const advancedSurfaces = (
    <div className="space-y-4">
      <DashboardField label="Theme presets" hint="Start from a curated salon look, then fine-tune below.">
        <ThemePresetCards
          activePreset={form.bookingThemePreset}
          customAccent={form.accentColor}
          disabled={!business.canUseBookingPageTheme}
          onSelect={applyPreset}
        />
      </DashboardField>

      <div>
        <Label className="text-sm font-medium">Page background</Label>
        <div
          role="radiogroup"
          aria-label="Page background"
          className="mt-2 flex flex-wrap gap-2"
        >
          {PAGE_BACKGROUND_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={form.bookingPageBackground === option.value}
              onClick={() => updateForm("bookingPageBackground", option.value)}
              className={dashboardFilterPillClass(form.bookingPageBackground === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {form.bookingPageBackground === "custom" ? (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="color"
              value={form.bookingPageBackgroundColor}
              onChange={(e) => updateForm("bookingPageBackgroundColor", e.target.value)}
              className="size-11 cursor-pointer rounded-lg border bg-white p-1"
              aria-label="Custom page background color"
            />
            <input
              type="text"
              value={form.bookingPageBackgroundColor}
              onChange={(e) => updateForm("bookingPageBackgroundColor", e.target.value)}
              className={`${dashboardInputClass} max-w-[8rem] font-mono`}
              aria-label="Custom page background hex"
            />
          </div>
        ) : null}
      </div>

      {form.bookingPageBackground === "accent" ? (
        <div>
          <Label className="text-sm font-medium">Content panel</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            White card on the accent page, or a stronger brand panel.
          </p>
          <div
            role="radiogroup"
            aria-label="Content panel background"
            className="mt-2 flex flex-wrap gap-2"
          >
            {PANEL_BACKGROUND_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={form.bookingPanelBackground === option.value}
                onClick={() => updateForm("bookingPanelBackground", option.value)}
                className={dashboardFilterPillClass(form.bookingPanelBackground === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Accordion>
        <AccordionItem value="hero">
          <AccordionTrigger className="text-sm font-medium">Hero overlay</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div
              role="radiogroup"
              aria-label="Hero overlay style"
              className="flex flex-wrap gap-2"
            >
              {HERO_OVERLAY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={form.bookingHeroOverlay === option.value}
                  onClick={() => updateForm("bookingHeroOverlay", option.value)}
                  className={dashboardFilterPillClass(form.bookingHeroOverlay === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {form.bookingHeroOverlay !== "none" ? (
              <div>
                <Label className="text-sm font-medium">
                  Overlay strength ({overlayDraft}%)
                </Label>
                <Slider
                  className="mt-3"
                  min={0}
                  max={100}
                  value={[overlayDraft]}
                  onValueChange={(values) => {
                    setOverlayDraft(sliderValue(values));
                  }}
                  onValueCommitted={(values) => {
                    updateForm("bookingHeroOverlayOpacity", sliderValue(values));
                  }}
                  aria-label="Hero overlay strength"
                />
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-24">
      <BlurFade delay={0.02}>
        <section className={dashboardSectionClass} aria-labelledby="identity-heading">
          <div className="flex items-center gap-2">
            <Icon name="image" className="text-sm text-muted-foreground" aria-hidden="true" />
            <h3 id="identity-heading" className="text-sm font-semibold text-foreground">
              Identity
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Logo and hero images for your public booking page.
          </p>
          <div className="mt-4 space-y-6">
            <ImageUploadField
              label="Logo"
              hint="Shown in the header. Upload a logo to get color suggestions below."
              value={logoUrl}
              onChange={setLogoUrl}
              kind="logo"
              aspectRatio={1}
              outputWidth={512}
              previewShape="circle"
              onCroppedBlob={(blob) => {
                void loadLogoColors(blob);
              }}
            />
            <Separator />
            <ImageUploadField
              label="Hero banner"
              hint="Wide image at the top of your booking page. Also shown in the live preview."
              value={heroBannerUrl}
              onChange={setHeroBannerUrl}
              kind="banner"
              aspectRatio={16 / 9}
              outputWidth={1600}
              previewShape="wide"
            />
          </div>
        </section>
      </BlurFade>

      <BlurFade delay={0.05}>
        <section className={dashboardSectionClass} aria-labelledby="brand-heading">
          <div className="flex items-center gap-2">
            <Icon name="palette" className="text-sm text-muted-foreground" aria-hidden="true" />
            <h3 id="brand-heading" className="text-sm font-semibold text-foreground">
              Brand & theme
            </h3>
          </div>

          <div className="mt-4 space-y-5">
            <DashboardField
              label="Brand color"
              hint="Used on buttons, selected services, and time slots."
            >
              <BrandColorPicker
                options={logoColorOptions}
                value={form.accentColor}
                loading={logoColorsLoading}
                contrastHintId={contrastHintId}
                onChange={(hex) => updateForm("accentColor", hex)}
              />
              {contrastWarning ? (
                <Alert
                  id={contrastHintId}
                  className="mt-3 border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  <Icon name="exclamation-triangle" aria-hidden="true" />
                  <AlertDescription className="text-xs">
                    <strong>Warning:</strong> {contrastWarning}
                    {contrastValue ? ` (${contrastValue.toFixed(1)}:1)` : null}
                  </AlertDescription>
                </Alert>
              ) : null}
            </DashboardField>

            <Separator />

            <ThemeEditorLockedSection
              enabled={business.canUseBookingPageTheme}
              feature="bookingPageTheme"
            >
              <ThemeStyleModeToggle
                solid={solidTheme}
                disabled={!business.canUseBookingPageTheme}
                onChange={setSolidTheme}
              />
            </ThemeEditorLockedSection>

            {!solidTheme ? (
              <ThemeEditorLockedSection
                enabled={business.canUseBookingPageTheme}
                feature="bookingPageTheme"
              >
                <div>
                  <Label className="text-sm font-medium">Advanced surfaces</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fine-tune presets, backgrounds, and hero overlay.
                  </p>
                  <div className="mt-3">{advancedSurfaces}</div>
                </div>
              </ThemeEditorLockedSection>
            ) : null}
          </div>
        </section>
      </BlurFade>

      <BlurFade delay={0.08}>
        <section className={dashboardSectionClass} aria-labelledby="gallery-heading">
          <div className="flex items-center gap-2">
            <Icon name="images" className="text-sm text-muted-foreground" aria-hidden="true" />
            <h3 id="gallery-heading" className="text-sm font-semibold text-foreground">
              Gallery
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional extra photos below the hero banner.
          </p>
          {galleryRest.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {galleryRest.map((url) => (
                <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted/20">
                  <GalleryThumb url={url} />
                  <button
                    type="button"
                    onClick={() => setGalleryRest((prev) => prev.filter((item) => item !== url))}
                    className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full bg-black/60 text-white sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <Icon name="x-lg" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-3">
            <ImageUploadField
              label="Add gallery photo"
              hint={`${galleryImageCount}/12 photos`}
              value=""
              onChange={(url) => {
                if (!url || galleryRest.includes(url) || galleryAtLimit) return;
                setGalleryRest((prev) => [...prev, url]);
              }}
              kind="gallery"
              aspectRatio={4 / 3}
              outputWidth={1200}
              previewShape="wide"
              allowUrl
            />
          </div>
        </section>
      </BlurFade>

      <BlurFade delay={0.1}>
        <section className={dashboardSectionClass} aria-labelledby="footer-heading">
          <div className="flex items-center gap-2">
            <Icon name="person-badge" className="text-sm text-muted-foreground" aria-hidden="true" />
            <h3 id="footer-heading" className="text-sm font-semibold text-foreground">
              Footer
            </h3>
          </div>
          {business.canCustomizeBookingPage ? (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <Label htmlFor={footerSwitchId} className="text-sm font-medium">
                  Remove Dinaya branding
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Hides the small &quot;Powered by Dinaya&quot; link in your booking footer.
                </p>
              </div>
              <Switch
                id={footerSwitchId}
                checked={form.hideDinayaBranding}
                onCheckedChange={(checked) => updateForm("hideDinayaBranding", checked)}
              />
            </div>
          ) : (
            <ThemeEditorLockedSection enabled={false} feature="publicBookingPageCustomization">
              <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 opacity-60">
                <Label className="text-sm font-medium">Remove Dinaya branding</Label>
                <Switch checked={false} disabled />
              </div>
            </ThemeEditorLockedSection>
          )}
        </section>
      </BlurFade>

      <div className="sticky bottom-0 z-20 -mx-1 border-t bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving} className={dashboardPrimaryActionClass}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {saved ? <span className="text-sm text-emerald-600">Saved</span> : null}
          {error ? <span className={dashboardErrorAlertClass}>{error}</span> : null}
        </div>
      </div>
    </form>
  );
}
