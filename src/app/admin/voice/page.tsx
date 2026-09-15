import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { PhoneCall } from "lucide-react";
import { db } from "@/db";
import { businesses, voiceIntegrations, type VoiceIntegration } from "@/db/schema";
import { safeAdminQuery } from "@/lib/admin-db";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import type { Plan } from "@/lib/plan";
import {
  VOICE_LANGUAGES,
  VOICE_STATUSES,
  normalizeVoiceLanguages,
  voiceStatusLabel,
} from "@/lib/voice-receptionist";
import { updateVoiceIntegration } from "./actions";

export const dynamic = "force-dynamic";

type VoiceAdminRow = {
  integration: VoiceIntegration;
  business: {
    id: string;
    name: string;
    slug: string;
    plan: Plan;
    phone: string | null;
  };
};

function dateLabel(value: Date | null): string {
  return value ? format(value, "d MMM, h:mm a") : "Not set";
}

export default async function AdminVoicePage() {
  await requirePlatformAdmin();

  const rows = await safeAdminQuery(
    db
      .select({
        integration: voiceIntegrations,
        business: {
          id: businesses.id,
          name: businesses.name,
          slug: businesses.slug,
          plan: businesses.plan,
          phone: businesses.phone,
        },
      })
      .from(voiceIntegrations)
      .innerJoin(businesses, eq(businesses.id, voiceIntegrations.businessId))
      .orderBy(desc(voiceIntegrations.updatedAt)),
    [] as VoiceAdminRow[],
  );

  const languageLabels = new Map(VOICE_LANGUAGES.map((language) => [language.value, language.label]));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PhoneCall className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-cal text-3xl tracking-tight">AI Voice Receptionist</h1>
            <p className="text-sm text-muted-foreground">
              Internal setup tracking for the future voice rollout.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <h2 className="text-sm font-semibold text-primary">Phase 2: Dinaya-hosted Twilio voice</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Set <code className="rounded bg-white px-1 dark:bg-neutral-800 text-xs">TWILIO_CONVERSATION_RELAY_WS_URL</code> to
          enable ConversationRelay for inbound calls. Point a Twilio number voice webhook to:
        </p>
        <p className="mt-2 rounded-md border bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-2 font-mono text-xs">
          POST /api/v1/voice/twilio?businessId=&lt;business-uuid&gt;
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          This is paused for tenant users until rollout. After launch, bookings will flow through <code className="rounded bg-white px-1 dark:bg-neutral-800">/api/v1/bookings</code> with source <code className="rounded bg-white px-1 dark:bg-neutral-800">voice_agent</code>.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="font-medium">No voice setup requests yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Requests will appear here after Dinaya opens the voice setup form.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(({ business, integration }) => (
            <section key={integration.id} className="overflow-hidden rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="grid gap-4 border-b bg-muted/30 p-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{business.name}</h2>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium uppercase text-primary">
                      {business.plan}
                    </span>
                    <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {voiceStatusLabel(integration.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    /book/{business.slug} · business phone {integration.businessPhone ?? business.phone ?? "not set"}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <dt>Requested</dt>
                    <dd className="mt-1 font-medium text-foreground">{dateLabel(integration.requestedAt)}</dd>
                  </div>
                  <div>
                    <dt>Last tested</dt>
                    <dd className="mt-1 font-medium text-foreground">{dateLabel(integration.lastTestedAt)}</dd>
                  </div>
                </dl>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Languages</p>
                    <p className="mt-1">
                      {normalizeVoiceLanguages(integration.languages)
                        .map((language) => languageLabels.get(language) ?? language)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoBlock title="Opening rules" value={integration.openingRules} />
                    <InfoBlock title="Service rules" value={integration.serviceRules} />
                    <InfoBlock title="Booking rules" value={integration.bookingRules} />
                    <InfoBlock title="FAQ notes" value={integration.faqNotes} />
                    <InfoBlock title="Welcome" value={integration.welcomeMessage} />
                    <InfoBlock title="Fallback" value={integration.fallbackMessage} />
                  </div>
                </div>

                <form action={updateVoiceIntegration} className="space-y-3 rounded-lg border bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4">
                  <input type="hidden" name="id" value={integration.id} />
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</span>
                    <select
                      name="status"
                      defaultValue={integration.status}
                      className="mt-1 h-10 w-full rounded-md border bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 text-sm outline-hidden focus:ring-2 focus:ring-primary/30"
                    >
                      {VOICE_STATUSES.map((status) => (
                        <option key={status} value={status}>{voiceStatusLabel(status)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Provider</span>
                    <input
                      name="providerName"
                      defaultValue={integration.providerName}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-hidden focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI phone number</span>
                    <input
                      name="aiPhoneNumber"
                      defaultValue={integration.aiPhoneNumber ?? ""}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-hidden focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Setup notes</span>
                    <textarea
                      name="setupNotes"
                      defaultValue={integration.setupNotes ?? ""}
                      className="mt-1 min-h-24 w-full rounded-md border px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="markTested" className="size-4 rounded border-muted-foreground/30 text-primary focus:ring-primary" />
                      Mark tested now
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="markActivated" className="size-4 rounded border-muted-foreground/30 text-primary focus:ring-primary" />
                      Mark activated now
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Save setup status
                  </button>
                </form>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value || "Not provided"}</p>
    </div>
  );
}
