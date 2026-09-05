"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useDashboardCopy } from "@/components/dashboard/DashboardLocaleProvider";
import { buildPublicBookingUrl } from "@/lib/booking-url";
import { isOptimizableRemoteImage } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { dashboardInputClass } from "@/lib/dashboard-ui";
import { ImageUploadField } from "@/components/dashboard/ImageUploadField";
import { Button } from "@/components/ui/button";

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

export default function SettingsForm({ business }: Props) {
  const settingsCopy = useDashboardCopy().settings;
  const bookingUrl = buildPublicBookingUrl({
    slug: business.slug,
    customDomain: business.customDomain,
    customDomainVerified: business.customDomainVerified,
  });
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
  });

  const [galleryImages, setGalleryImages] = useState<string[]>(
    business.galleryImages ?? []
  );
  const [logoUrl, setLogoUrl] = useState(business.logoUrl ?? "");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  function removeGalleryImage(url: string) {
    setGalleryImages((prev) => prev.filter((u) => u !== url));
  }

  const inputCls = `${dashboardInputClass} mt-0`;

  return (
    <div className="space-y-5">
      <form onSubmit={handleSave} className="grid gap-5 xl:grid-cols-2">
        {/* Business info */}
        <div className="rounded-2xl border border-border/60 bg-card dark:border-border/60 dark:bg-card p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Business info</p>
          <div>
            <label className="text-sm font-medium">Business name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Tell clients about your business…"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputCls}
              placeholder="+94 77 000 0000"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className={inputCls}
              placeholder="123 Main St, Colombo 03"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              className={inputCls}
            >
              <option value="Asia/Colombo">Asia/Colombo</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">{settingsCopy.languageLabel}</label>
            <p className="mt-0.5 text-xs text-muted-foreground">{settingsCopy.languageHint}</p>
            <select
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              className={inputCls}
            >
              <option value="en">English</option>
              <option value="si">Sinhala</option>
              <option value="ta">Tamil</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Business type</label>
            <select
              value={form.businessType}
              onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
              className={inputCls}
            >
              <option value="salon_barber">Salon / barber</option>
              <option value="clinic">Clinic</option>
              <option value="tuition">Tuition / classes</option>
              <option value="vehicle_service">Vehicle service</option>
              <option value="photography">Photography</option>
              <option value="spa_wellness">Spa / wellness</option>
              <option value="consulting">Consulting</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="pt-1">
            <p className="text-xs text-muted-foreground mb-1">Your booking URL</p>
            <code className="text-sm text-primary bg-primary/5 px-2.5 py-1 rounded-md break-all">
              {bookingUrl.replace(/^https?:\/\//, "")}
            </code>
          </div>
        </div>

        {/* Booking policies */}
        <div className="rounded-2xl border border-border/60 bg-card dark:border-border/60 dark:bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="shield-check" className="text-sm text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Booking trust</p>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            These policies appear on the public booking page before a client confirms.
          </p>
          <div>
            <label className="text-sm font-medium">Cancellation policy</label>
            <textarea
              value={form.cancellationPolicy}
              onChange={(e) => setForm((f) => ({ ...f, cancellationPolicy: e.target.value }))}
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Example: Please reschedule at least 12 hours before the appointment."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Deposit policy</label>
            <textarea
              value={form.depositPolicy}
              onChange={(e) => setForm((f) => ({ ...f, depositPolicy: e.target.value }))}
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Example: Deposits are deducted from the final bill and may be non-refundable for no-shows."
            />
          </div>
        </div>

        {/* Local payment fallback */}
        <div className="rounded-2xl border border-border/60 bg-card dark:border-border/60 dark:bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="bank" className="text-sm text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Local payment fallback</p>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Use this when PayHere is not enabled or when a client prefers bank transfer or LankaQR proof.
          </p>
          <div>
            <label className="text-sm font-medium">Bank transfer / payment proof instructions</label>
            <textarea
              value={form.bankTransferInstructions}
              onChange={(e) => setForm((f) => ({ ...f, bankTransferInstructions: e.target.value }))}
              className={`${inputCls} resize-none`}
              rows={4}
              placeholder="Bank, account number, account name, branch, and what reference clients should send on WhatsApp."
            />
          </div>
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

        {/* Social links */}
        <div className="rounded-2xl border border-border/60 bg-card dark:border-border/60 dark:bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="share" className="text-sm text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Social links</p>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            These appear on your public booking page so clients can find you elsewhere.
          </p>
          <div>
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Icon name="instagram" className="text-pink-500" /> Instagram
            </label>
            <input
              value={form.instagramUrl}
              onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
              className={inputCls}
              placeholder="https://instagram.com/yourbusiness"
            />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Icon name="facebook" className="text-blue-600" /> Facebook
            </label>
            <input
              value={form.facebookUrl}
              onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))}
              className={inputCls}
              placeholder="https://facebook.com/yourbusiness"
            />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Icon name="globe" className="text-gray-500 dark:text-gray-400" /> Website
            </label>
            <input
              value={form.websiteUrl}
              onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              className={inputCls}
              placeholder="https://yourbusiness.lk"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card dark:border-border/60 dark:bg-card p-6 space-y-4 xl:col-span-2">
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

        {/* Portfolio gallery */}
        <div className="rounded-2xl border border-border/60 bg-card dark:border-border/60 dark:bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="images" className="text-sm text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Portfolio gallery</p>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Showcase your work on your booking page. Upload photos directly — no third-party host needed.
          </p>

          {/* Existing images */}
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
                    <Icon name="x-lg" />
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

        {/* Booking page appearance */}
        <div className="rounded-2xl border border-border/60 bg-card dark:border-border/60 dark:bg-card p-6 space-y-3 xl:col-span-2">
          <div className="flex items-center gap-2">
            <Icon name="palette" className="text-sm text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Booking page look</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Customize your logo, hero banner, accent color, and page background on the dedicated booking page editor.
          </p>
          <Link
            href="/dashboard/booking-page"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open booking page editor
          </Link>
        </div>

        {/* PayHere */}
        <div className="rounded-2xl border border-border/60 bg-card dark:border-border/60 dark:bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="credit-card" className="text-sm text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">PayHere</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Accept online payments via{" "}
            <a href="https://www.payhere.lk" target="_blank" rel="noopener noreferrer" className="underline">
              PayHere
            </a>
            . Enter your Merchant ID and Secret from the PayHere dashboard.
          </p>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.payhereEnabled}
              onChange={(e) => setForm((f) => ({ ...f, payhereEnabled: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm font-medium">Enable PayHere for this business</span>
          </label>
          {form.payhereEnabled && (
            <div className="space-y-3 pl-5 border-l-2 border-primary/20">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Merchant ID</label>
                <input
                  value={form.payhereMerchantId}
                  onChange={(e) => setForm((f) => ({ ...f, payhereMerchantId: e.target.value }))}
                  placeholder="123456"
                  className={inputCls}
                />
              </div>
              <div>
	                <label className="text-xs font-medium text-muted-foreground">Merchant Secret</label>
	                <input
	                  type="password"
	                  value={form.payhereMerchantSecret}
	                  onChange={(e) => setForm((f) => ({ ...f, payhereMerchantSecret: e.target.value }))}
	                  placeholder={business.hasPayhereMerchantSecret ? "Saved - leave blank to keep existing" : "Paste merchant secret"}
	                  className={inputCls}
	                />
	                {business.hasPayhereMerchantSecret && (
	                  <p className="mt-1 text-xs text-muted-foreground">
	                    A secret is saved. Enter a new value only when rotating it.
	                  </p>
	                )}
	              </div>
            </div>
          )}
        </div>

        {/* PayPal */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="globe" className="text-sm text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">PayPal</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Accept international card and PayPal wallet payments in USD. Best for overseas customers booking your
            Sri Lankan business. Create a REST app in the{" "}
            <a href="https://developer.paypal.com/dashboard/applications/live" target="_blank" rel="noopener noreferrer" className="underline">
              PayPal Developer Dashboard
            </a>
            .
          </p>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.paypalEnabled}
              onChange={(e) => setForm((f) => ({ ...f, paypalEnabled: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm font-medium">Enable PayPal for international payments</span>
          </label>
          {form.paypalEnabled && (
            <div className="space-y-3 pl-5 border-l-2 border-primary/20">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Client ID</label>
                <input
                  value={form.paypalClientId}
                  onChange={(e) => setForm((f) => ({ ...f, paypalClientId: e.target.value }))}
                  placeholder="Abc123..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Client Secret</label>
                <input
                  type="password"
                  value={form.paypalClientSecret}
                  onChange={(e) => setForm((f) => ({ ...f, paypalClientSecret: e.target.value }))}
                  placeholder={business.hasPaypalClientSecret ? "Saved - leave blank to keep existing" : "Paste client secret"}
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        {/* Data controls */}
        <div className="rounded-2xl border border-border/60 bg-card dark:border-border/60 dark:bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="download" className="text-sm text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data controls</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Export business, client, booking, review, and payment records as JSON. Payment card details are never stored in Dinaya.
          </p>
          <a
            href="/api/dashboard/export"
            className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium text-primary hover:border-primary/40 hover:bg-primary/5"
          >
            Export all data
          </a>
        </div>

        {error && <p className="text-destructive text-sm xl:col-span-2">{error}</p>}

        <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-neutral-200 bg-neutral-50 px-1 py-4 xl:col-span-2 dark:border-neutral-800 dark:bg-neutral-950">
          <Button type="submit" disabled={saving} className="min-h-11">
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-green-600 text-sm">
              <Icon name="check-circle" className="text-sm" /> Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
