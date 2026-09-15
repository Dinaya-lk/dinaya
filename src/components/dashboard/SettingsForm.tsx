"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Tabs, toast } from "@heroui/react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardSelect, DashboardSwitch, DashboardTextAreaField, DashboardTextField } from "@/components/dashboard/DashboardFormField";
import { DashboardCopyField } from "@/components/dashboard/DashboardCopyField";
import { submitResource } from "@/lib/dashboard/use-resource";
import { useDashboardCopy } from "@/components/dashboard/DashboardLocaleProvider";
import { buildPublicBookingUrl } from "@/lib/booking-url";
import { isOptimizableRemoteImage } from "@/lib/utils";
import {
  Banknote,
  CreditCard,
  Download,
  ExternalLink,
  Globe,
  Images,
  Link2,
  MapPin,
  Palette,
  Share2,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  dashboardErrorAlertClass,
  dashboardOutlineActionClass,
  dashboardPageClass,
  dashboardPrimaryActionClass,
} from "@/lib/dashboard-ui";
import { ImageUploadField } from "@/components/dashboard/ImageUploadField";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        enabled ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground",
      )}
    >
      {enabled ? "Enabled" : "Not enabled"}
    </span>
  );
}

type SettingsBusiness = {
  address: string | null;
  bankTransferInstructions: string | null;
  businessType: string | null;
  cancellationPolicy: string | null;
  description: string | null;
  depositPolicy: string | null;
  facebookUrl: string | null;
  galleryImages: string[] | null;
  logoUrl: string | null;
  instagramUrl: string | null;
  language: string;
  lankaqrImageUrl: string | null;
  name: string;
  payhereEnabled: boolean;
  payhereMerchantId: string | null;
  hasPayhereMerchantSecret: boolean;
  paypalEnabled: boolean;
  paypalClientId: string | null;
  hasPaypalClientSecret: boolean;
  paymentsLkEnabled: boolean;
  hasPaymentsLkSecretKey: boolean;
  hasPaymentsLkWebhookSecret: boolean;
  hideDinayaBranding: boolean;
  accentColor: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  canCustomizeBookingPage: boolean;
  phone: string | null;
  slug: string;
  timezone: string;
  websiteUrl: string | null;
};

interface Props { business: SettingsBusiness; }

const TIMEZONE_OPTIONS = [
  { value: "Asia/Colombo", label: "Asia/Colombo" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata" },
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "UTC", label: "UTC" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "si", label: "Sinhala" },
  { value: "ta", label: "Tamil" },
];

const BUSINESS_TYPE_OPTIONS = [
  { value: "salon_barber", label: "Salon / barber" },
  { value: "clinic", label: "Clinic" },
  { value: "tuition", label: "Tuition / classes" },
  { value: "vehicle_service", label: "Vehicle service" },
  { value: "photography", label: "Photography" },
  { value: "spa_wellness", label: "Spa / wellness" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

const cardClass = "rounded-2xl border border-border/60 bg-card p-6 space-y-4";

export default function SettingsForm({ business }: Props) {
  const settingsCopy = useDashboardCopy().settings;
  const bookingUrl = buildPublicBookingUrl({
    slug: business.slug,
    customDomain: business.customDomain,
    customDomainVerified: business.customDomainVerified,
  });
  const [activeTab, setActiveTab] = useState("general");
  const [form, setForm] = useState({
    name: business.name,
    description: business.description ?? "",
    phone: business.phone ?? "",
    address: business.address ?? "",
    timezone: business.timezone,
    language: business.language ?? "en",
    businessType: business.businessType ?? "other",
    cancellationPolicy: business.cancellationPolicy ?? "",
    depositPolicy: business.depositPolicy ?? "",
    bankTransferInstructions: business.bankTransferInstructions ?? "",
    lankaqrImageUrl: business.lankaqrImageUrl ?? "",
    instagramUrl: business.instagramUrl ?? "",
    facebookUrl: business.facebookUrl ?? "",
    websiteUrl: business.websiteUrl ?? "",
    payhereEnabled: business.payhereEnabled,
    payhereMerchantId: business.payhereMerchantId ?? "",
    payhereMerchantSecret: "",
    paypalEnabled: business.paypalEnabled,
    paypalClientId: business.paypalClientId ?? "",
    paypalClientSecret: "",
    paymentsLkEnabled: business.paymentsLkEnabled,
    paymentsLkSecretKey: "",
    paymentsLkWebhookSecret: "",
  });

  const [galleryImages, setGalleryImages] = useState<string[]>(
    business.galleryImages ?? []
  );
  const [logoUrl, setLogoUrl] = useState(business.logoUrl ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      galleryImages,
      logoUrl: logoUrl.trim() || null,
      payhereMerchantSecret: form.payhereMerchantSecret.trim() || undefined,
      paypalClientId: form.paypalClientId.trim() || null,
      paypalClientSecret: form.paypalClientSecret.trim() || undefined,
      paymentsLkSecretKey: form.paymentsLkSecretKey.trim() || undefined,
      paymentsLkWebhookSecret: form.paymentsLkWebhookSecret.trim() || undefined,
    };

    const result = await submitResource("/api/dashboard/settings", payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Settings saved");
  }

  function removeGalleryImage(url: string) {
    setGalleryImages((prev) => prev.filter((u) => u !== url));
  }

  return (
    <Tabs.Root selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(String(key))} className={dashboardPageClass}>
      <DashboardPageHeader
        title="Settings"
        description="Business profile, booking policies, payments, and public page branding."
        tabs={
          <Tabs.List>
            <Tabs.Tab id="general">General</Tabs.Tab>
            <Tabs.Tab id="booking-page">Booking page</Tabs.Tab>
            <Tabs.Tab id="payments">Payments</Tabs.Tab>
            <Tabs.Tab id="data">Data</Tabs.Tab>
          </Tabs.List>
        }
      />

      <form onSubmit={handleSave} className="space-y-5">
        <Tabs.Panel id="general">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,28rem)_1fr]">
            <div className={cardClass}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Business info</p>
              <DashboardTextField
                label="Business name"
                isRequired
                value={form.name}
                onChange={(value) => setForm((f) => ({ ...f, name: value }))}
              />
              <DashboardTextAreaField
                label="Description"
                value={form.description}
                onChange={(value) => setForm((f) => ({ ...f, description: value }))}
                rows={3}
                placeholder="Tell clients about your business…"
              />
              <DashboardTextField
                label="Phone"
                value={form.phone}
                onChange={(value) => setForm((f) => ({ ...f, phone: value }))}
                placeholder="+94 77 000 0000"
              />
              <DashboardTextField
                label="Address"
                value={form.address}
                onChange={(value) => setForm((f) => ({ ...f, address: value }))}
                placeholder="123 Main St, Colombo 03"
              />
            </div>

            <div className="space-y-5">
              <div className={cardClass}>
                <div className="flex items-center gap-2">
                  <Link2 className="size-4 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your public page</p>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  What clients see when they book with {form.name || "you"}.
                </p>
                <DashboardCopyField label="Booking link" value={bookingUrl} rows={1} mono />
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(dashboardOutlineActionClass, "w-full justify-center")}
                >
                  <ExternalLink className="size-4" />
                  View live page
                </a>
              </div>

              <div className={cardClass}>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Locale</p>
                </div>
                <DashboardSelect
                  label="Timezone"
                  value={form.timezone}
                  onChange={(value) => setForm((f) => ({ ...f, timezone: value }))}
                  options={TIMEZONE_OPTIONS}
                />
                <DashboardSelect
                  label={settingsCopy.languageLabel}
                  hint={settingsCopy.languageHint}
                  value={form.language}
                  onChange={(value) => setForm((f) => ({ ...f, language: value }))}
                  options={LANGUAGE_OPTIONS}
                />
                <DashboardSelect
                  label="Business type"
                  value={form.businessType}
                  onChange={(value) => setForm((f) => ({ ...f, businessType: value }))}
                  options={BUSINESS_TYPE_OPTIONS}
                />
              </div>
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="booking-page">
          <div className="grid gap-5 xl:grid-cols-2">
            <div className={cardClass}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Booking trust</p>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                These policies appear on the public booking page before a client confirms.
              </p>
              <DashboardTextAreaField
                label="Cancellation policy"
                value={form.cancellationPolicy}
                onChange={(value) => setForm((f) => ({ ...f, cancellationPolicy: value }))}
                rows={3}
                placeholder="Example: Please reschedule at least 12 hours before the appointment."
              />
              <DashboardTextAreaField
                label="Deposit policy"
                value={form.depositPolicy}
                onChange={(value) => setForm((f) => ({ ...f, depositPolicy: value }))}
                rows={3}
                placeholder="Example: Deposits are deducted from the final bill and may be non-refundable for no-shows."
              />
            </div>

            <div className={cardClass}>
              <div className="flex items-center gap-2">
                <Share2 className="size-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Social links</p>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                These appear on your public booking page so clients can find you elsewhere.
              </p>
              <DashboardTextField
                label="Instagram"
                value={form.instagramUrl}
                onChange={(value) => setForm((f) => ({ ...f, instagramUrl: value }))}
                placeholder="https://instagram.com/yourbusiness"
              />
              <DashboardTextField
                label="Facebook"
                value={form.facebookUrl}
                onChange={(value) => setForm((f) => ({ ...f, facebookUrl: value }))}
                placeholder="https://facebook.com/yourbusiness"
              />
              <DashboardTextField
                label="Website"
                value={form.websiteUrl}
                onChange={(value) => setForm((f) => ({ ...f, websiteUrl: value }))}
                placeholder="https://yourbusiness.lk"
              />
            </div>

            <div className={cn(cardClass, "xl:col-span-2")}>
              <ImageUploadField
                label="Business logo"
                hint="Shown on your booking page next to your business name. Square logos work best."
                value={logoUrl}
                onChange={setLogoUrl}
                kind="logo"
                aspectRatio={1}
                outputWidth={512}
                previewShape="circle"
              />
            </div>

            <div className={cardClass}>
              <div className="flex items-center gap-2">
                <Images className="size-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Portfolio gallery</p>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Showcase your work on your booking page. Upload photos directly — no third-party host needed.
              </p>

              {galleryImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {galleryImages.map((url) => (
                    <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted/20">
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="120px"
                        className="object-cover"
                        unoptimized={!isOptimizableRemoteImage(url)}
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(url)}
                        className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <ImageUploadField
                label="Add portfolio photo"
                hint={`${galleryImages.length}/12 photos`}
                value=""
                onChange={(url) => {
                  if (!url || galleryImages.includes(url) || galleryImages.length >= 12) return;
                  setGalleryImages((prev) => [...prev, url]);
                }}
                kind="gallery"
                aspectRatio={4 / 3}
                outputWidth={1200}
                previewShape="wide"
                allowUrl
              />
            </div>

            <div className={cn(cardClass, "xl:col-span-2")}>
              <div className="flex items-center gap-2">
                <Palette className="size-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Booking page look</p>
              </div>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="size-11 shrink-0 overflow-hidden rounded-full border border-border/60 bg-cover bg-center"
                    style={{
                      backgroundColor: business.accentColor || "var(--primary)",
                      backgroundImage: logoUrl ? `url(${logoUrl})` : undefined,
                    }}
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">
                    Logo, hero banner, accent color, and page background — edited on the dedicated booking page editor.
                  </p>
                </div>
                <Link
                  href="/dashboard/booking-page"
                  className={cn(dashboardPrimaryActionClass, "shrink-0")}
                >
                  Open booking page editor
                </Link>
              </div>
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="payments">
          <div className="grid gap-5 xl:grid-cols-2">
            <div className={cardClass}>
              <div className="flex items-center gap-2">
                <Banknote className="size-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Local payment fallback</p>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Use this when PayHere is not enabled or when a client prefers bank transfer or LankaQR proof.
              </p>
              <DashboardTextAreaField
                label="Bank transfer / payment proof instructions"
                value={form.bankTransferInstructions}
                onChange={(value) => setForm((f) => ({ ...f, bankTransferInstructions: value }))}
                rows={4}
                placeholder="Bank, account number, account name, branch, and what reference clients should send on WhatsApp."
              />
              <ImageUploadField
                label="LankaQR image"
                hint="Upload your LankaQR so clients can scan it at checkout. You can still paste a URL."
                value={form.lankaqrImageUrl}
                onChange={(url) => setForm((f) => ({ ...f, lankaqrImageUrl: url }))}
                kind="lankaqr"
                aspectRatio={1}
                outputWidth={800}
                previewShape="square"
                allowUrl
              />
            </div>

            <div className="space-y-5">
              <div className={cardClass}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">PayHere</p>
                  </div>
                  <StatusPill enabled={form.payhereEnabled} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Accept online payments via{" "}
                  <a href="https://www.payhere.lk" target="_blank" rel="noopener noreferrer" className="underline">
                    PayHere
                  </a>
                  . Enter your Merchant ID and Secret from the PayHere dashboard.
                </p>
                <DashboardSwitch
                  label="Enable PayHere for this business"
                  isSelected={form.payhereEnabled}
                  onChange={(isSelected) => setForm((f) => ({ ...f, payhereEnabled: isSelected }))}
                />
                {form.payhereEnabled && (
                  <div className="space-y-3 pl-5 border-l-2 border-primary/20">
                    <DashboardTextField
                      label="Merchant ID"
                      value={form.payhereMerchantId}
                      onChange={(value) => setForm((f) => ({ ...f, payhereMerchantId: value }))}
                      placeholder="123456"
                    />
                    <DashboardTextField
                      label="Merchant Secret"
                      type="password"
                      value={form.payhereMerchantSecret}
                      onChange={(value) => setForm((f) => ({ ...f, payhereMerchantSecret: value }))}
                      placeholder={business.hasPayhereMerchantSecret ? "Saved - leave blank to keep existing" : "Paste merchant secret"}
                      hint={business.hasPayhereMerchantSecret ? "A secret is saved. Enter a new value only when rotating it." : undefined}
                    />
                  </div>
                )}
              </div>

              <div className={cardClass}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payments.lk</p>
                  </div>
                  <StatusPill enabled={form.paymentsLkEnabled} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Accept online payments via{" "}
                  <a href="https://payments.lk" target="_blank" rel="noopener noreferrer" className="underline">
                    Payments.lk
                  </a>
                  . Enter your Secret Key and webhook signing secret from the Payments.lk dashboard, under Developers.
                </p>
                <DashboardSwitch
                  label="Enable Payments.lk for this business"
                  isSelected={form.paymentsLkEnabled}
                  onChange={(isSelected) => setForm((f) => ({ ...f, paymentsLkEnabled: isSelected }))}
                />
                {form.paymentsLkEnabled && (
                  <div className="space-y-3 pl-5 border-l-2 border-primary/20">
                    <DashboardTextField
                      label="Secret Key"
                      type="password"
                      value={form.paymentsLkSecretKey}
                      onChange={(value) => setForm((f) => ({ ...f, paymentsLkSecretKey: value }))}
                      placeholder={business.hasPaymentsLkSecretKey ? "Saved - leave blank to keep existing" : "sk_live_..."}
                      hint={business.hasPaymentsLkSecretKey ? "A secret is saved. Enter a new value only when rotating it." : undefined}
                    />
                    <DashboardTextField
                      label="Webhook signing secret"
                      type="password"
                      value={form.paymentsLkWebhookSecret}
                      onChange={(value) => setForm((f) => ({ ...f, paymentsLkWebhookSecret: value }))}
                      placeholder={business.hasPaymentsLkWebhookSecret ? "Saved - leave blank to keep existing" : "whsec_..."}
                      hint="From the endpoint you register in the Payments.lk dashboard for this booking page."
                    />
                  </div>
                )}
              </div>

              <div className={cardClass}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">PayPal</p>
                  </div>
                  <StatusPill enabled={form.paypalEnabled} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Accept international card and PayPal wallet payments in USD. Best for overseas customers booking your
                  Sri Lankan business. Create a REST app in the{" "}
                  <a href="https://developer.paypal.com/dashboard/applications/live" target="_blank" rel="noopener noreferrer" className="underline">
                    PayPal Developer Dashboard
                  </a>
                  .
                </p>
                <DashboardSwitch
                  label="Enable PayPal for international payments"
                  isSelected={form.paypalEnabled}
                  onChange={(isSelected) => setForm((f) => ({ ...f, paypalEnabled: isSelected }))}
                />
                {form.paypalEnabled && (
                  <div className="space-y-3 pl-5 border-l-2 border-primary/20">
                    <DashboardTextField
                      label="Client ID"
                      value={form.paypalClientId}
                      onChange={(value) => setForm((f) => ({ ...f, paypalClientId: value }))}
                      placeholder="Abc123..."
                    />
                    <DashboardTextField
                      label="Client Secret"
                      type="password"
                      value={form.paypalClientSecret}
                      onChange={(value) => setForm((f) => ({ ...f, paypalClientSecret: value }))}
                      placeholder={business.hasPaypalClientSecret ? "Saved - leave blank to keep existing" : "Paste client secret"}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="data">
          <div className={cn(cardClass, "max-w-xl")}>
            <div className="flex items-center gap-2">
              <Download className="size-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data controls</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Export business, client, booking, review, and payment records as JSON. Payment card details are never stored in Dinaya.
            </p>
            <a href="/api/dashboard/export" className={dashboardOutlineActionClass}>
              <Download className="size-4" />
              Export all data
            </a>
          </div>
        </Tabs.Panel>

        {error && <p className={dashboardErrorAlertClass}>{error}</p>}

        <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-border bg-card px-1 py-4">
          <Button type="submit" disabled={saving} className="min-h-11">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Tabs.Root>
  );
}
