# Dinaya Deployment Checklist

Use this checklist before pushing production changes that touch schema, auth, payments, booking flow, or dashboard routes.

## CI e2e (pull requests)

The `e2e` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) needs these **repository secrets**:

- `DATABASE_URL` — Neon connection string for test registrations
- `AUTH_SECRET` — same value as production/staging Auth.js secret

If either secret is missing, e2e is skipped with a workflow warning (verify still runs). Add the secrets under GitHub → Settings → Secrets and variables → Actions to enable full Playwright runs on PRs.

## Required environment variables

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (Settings → API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — **required for dashboard image uploads** (`POST /api/dashboard/upload/image`). Copy from Supabase → Project Settings → API → **service_role** (secret). Add to Vercel **Production** and **Preview**, then redeploy. Without it, upload buttons return 503.
- `AUTH_SECRET`
- `AUTH_URL`
- `SECRET_ENCRYPTION_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_DOMAIN`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — optional GA4 measurement ID for public deal funnel analytics
- `PAYHERE_SANDBOX`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `CRON_SECRET` (same value as the GitHub Actions secret below)

`AUTH_URL` and `NEXT_PUBLIC_APP_URL` must point at the active production host, for example `https://dinaya-lk.vercel.app` or `https://dinaya.lk`. Do not leave them pointing at an old preview deployment such as `dinaya-tau.vercel.app`; Auth.js will set stale callback cookies and dashboard sign-in can fail or redirect to the wrong app.

Production rate limiting (required on the live app, not preview):

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — distributed rate limiting. Production returns **503** when Upstash is missing or unreachable (no per-instance memory fallback). Preview and local dev may use the in-memory limiter.

Optional but recommended:
- `UPTIME_MONITOR_SUMMARY_URL` — full URL to `history/summary.json` for `/admin/health` Upptime history (30d uptime, incidents). `/admin/health` works without this: it runs live DB / email / PayHere probes instead.
- `UPTIME_MONITOR_GITHUB_REPO`, `UPTIME_MONITOR_GITHUB_BRANCH`, `UPTIME_MONITOR_GITHUB_TOKEN` — alternative to the URL above; defaults to `ArdenoStudio/dinaya-uptime-monitor` with `master` then `main` when branch is unset; token enables private-repo fetch via GitHub Contents API
- `VERCEL_TOKEN`, `VERCEL_PROJECT_ID_OR_NAME`, `VERCEL_TEAM_ID` or `VERCEL_TEAM_SLUG` — custom-domain provisioning for tenant-owned domains
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google Calendar OAuth on integrations and the public booking calendar overlay. Enable the Google Calendar API, add the canonical `NEXT_PUBLIC_APP_URL` origin (normally `https://dinaya.lk`) under **Authorized JavaScript origins**, and include `calendar.freebusy` on the OAuth consent screen. The signed canonical-origin popup lets booking pages on tenant subdomains and verified custom domains use the same client ID. Smart deal suggestions use Calendar free/busy access, so already-connected tenants may need to reconnect Google Calendar after scope changes.
- `CONTACT_INBOX_EMAIL` — contact form destination (defaults to hello@dinaya.lk)
- `NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER` — optional public support WhatsApp number; if unset, public WhatsApp support links are hidden
- `PLATFORM_ADMIN_EMAILS` — comma-separated allowlist for `/admin`
- `HEALTH_CHECK_SECRET` — dedicated secret for `/api/health/*` (falls back to `CRON_SECRET`)
- AI workflows: `AI_PROVIDER=groq`, `GROQ_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_REACTIVATION_DAYS`
- WhatsApp/social publishing: `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_SOCIAL_ACCESS_TOKEN`, `META_SOCIAL_PAGE_ID`
- Twilio WhatsApp fallback: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- SMS gateway: `SMS_HTTP_ENDPOINT`, `SMS_HTTP_API_KEY`, `SMS_HTTP_METHOD`, `SMS_HTTP_SENDER`

## PayHere production setup

Dinaya uses two separate PayHere models:

- Dinaya subscription billing uses Ardeno Studio/Dinaya's own PayHere merchant account through `DINAYA_PAYHERE_MERCHANT_ID`, `DINAYA_PAYHERE_MERCHANT_SECRET`, `DINAYA_PAYHERE_APP_ID`, and `DINAYA_PAYHERE_APP_SECRET`.
- Client booking payments use each tenant business's own PayHere Merchant ID and Merchant Secret stored from dashboard settings. Do not route all tenant booking revenue through Dinaya's merchant account unless PayHere has explicitly approved that platform or marketplace model.

Before setting `PAYHERE_SANDBOX=false`:

1. Confirm `NEXT_PUBLIC_APP_URL` and `AUTH_URL` point to the canonical production origin, normally `https://dinaya.lk`.
2. Confirm the PayHere domain/app approval matches the origin used for checkout return and notification URLs.
3. Run `npm run payhere:check` against the configured environment. Use `npm run payhere:check -- --skip-network` only for local env checks without HTTP probes.
4. Run a sandbox booking payment against a public staging URL. Localhost cannot receive PayHere `notify_url` callbacks unless it is tunneled.
5. Verify `/api/webhooks/payhere` moves a paid booking from `pending` to `confirmed` and sends the expected receipt/notifications.
6. Verify `/api/webhooks/payhere-subscription` moves a paid plan subscription from `pending` to `active`.
7. Verify PayHere Subscription Manager API access in production before relying on dashboard cancellation. PayHere live merchant APIs may require allowlisted domains or server IPs, and Vercel serverless outbound IPs may not be stable without a fixed-egress setup.

## Scheduled jobs

Scheduled jobs are invoked by GitHub Actions, not Vercel Cron. Keep `vercel.json` free of `crons` so Vercel Hobby deployments do not fail on non-daily schedules.

Configure these repository settings in GitHub:

- Repository variable or secret `DINAYA_APP_URL`: production app URL, for example `https://dinaya.lk`
- Repository secret `CRON_SECRET`: the same value configured in the Vercel/hosting environment
- Repository secret `DATABASE_URL_DIRECT` (preferred) or `DATABASE_URL`: required for the **DB Migrate** workflow (`.github/workflows/db-migrate.yml`). Use the Supabase **direct** connection string (port 5432) for `DATABASE_URL_DIRECT`. Without either secret, pushes to `master` skip migrations with a workflow warning.

All cron workflows use `DINAYA_APP_URL` and `CRON_SECRET`. Schedules are UTC:

| Workflow | Endpoint | Schedule |
|----------|----------|----------|
| `ai-workflows-cron.yml` | `/api/cron/ai-workflows` | every 30 minutes |
| `automations-cron.yml` | `/api/cron/automations` | every 15 minutes |
| `webhook-retries-cron.yml` | `/api/cron/webhook-retries` | every 15 minutes |
| `google-calendar-cron.yml` | `/api/cron/google-calendar-sync` | hourly |
| `booking-reminders-cron.yml` | `/api/cron/reminders` | hourly at :30 (covers bookings 20–28h out) |
| `deal-suggestions-cron.yml` | `/api/cron/deal-suggestions` | daily at 03:00 |
| `deal-holds-cron.yml` | `/api/cron/deal-holds` | every 15 minutes |
| `expire-pending-bookings-cron.yml` | `/api/cron/expire-pending-bookings` | every 15 minutes |

`SECRET_ENCRYPTION_KEY` must stay stable. Rotating it without re-encrypting stored secrets will make PayHere merchant secrets unreadable.

## Custom domains

Built-in tenant subdomains need `NEXT_PUBLIC_APP_DOMAIN=dinaya.lk` and a wildcard domain such as `*.dinaya.lk` assigned to the Vercel project. Vercel wildcard domains require the nameservers method so Vercel can issue wildcard SSL certificates.

Tenant-owned domains such as `book.salon.lk` require Vercel automation:

- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID_OR_NAME`
- `VERCEL_TEAM_ID` or `VERCEL_TEAM_SLUG` if the project belongs to a team

The dashboard flow is:

1. Tenant saves the domain.
2. Tenant adds the Dinaya TXT ownership record shown in `/dashboard/settings/integrations`.
3. Dinaya verifies TXT ownership.
4. Dinaya adds/checks the project domain through Vercel and shows the Vercel CNAME/A/TXT records.
5. Dinaya marks the custom domain active only after Vercel reports the project domain verified and not misconfigured.

## Local verification

```bash
npm run verify
npm run audit:high
```

The high-severity audit gate must pass before deployment. Moderate findings from dev tooling should be reviewed, but do not block a hotfix unless they affect production runtime.

## Database migration order

1. Confirm `DATABASE_URL` points at the intended database for app traffic.
2. Set `DATABASE_URL_DIRECT` (Supabase direct port **5432**) in GitHub Actions secrets for the **DB Migrate** workflow. Migrations do **not** run during Vercel builds — the pooler URL is unreliable for DDL from the build environment.
3. Run migrations before shipping code that depends on new columns or constraints (automatic on push to `master` via `.github/workflows/db-migrate.yml`, or manually):

```bash
npm run db:migrate
```

3. Confirm the latest migration appears in the Drizzle migrations table. Recent additions include:
   - `0011_booking_notifications.sql`
   - `0012_pro_growth.sql`
   - `0013_platform_settings.sql`
   - `0014_phase5_growth.sql`
   - `0015_security_performance_indexes.sql`
   - `0016_voice_receptionist.sql`
   - `0017_onboarding.sql`
   - `0018_directory_backfill.sql`
   - `0019_broadcasts.sql`
   - `0020_deals.sql`
   - `0021_deal_slot_release.sql`
   - `0022_platform_admin_security.sql`
   - `0033_booking_idempotency.sql` — public booking idempotency keys (`Idempotency-Key` header / session token)
4. Deploy the app.
5. Smoke test:
   - `GET /api/health`
   - `/auth/signin`
   - `/register` → `/dashboard/setup` (4-step onboarding wizard)
   - `/discover?category=salon`
   - `/dashboard/reports` (analytics charts + deal analytics)
   - `/dashboard/deals` (create/cancel/edit deals on Pro+)
   - `/dashboard/ai` (reactivation manual trigger)
   - `/dashboard/settings/voice-receptionist` (coming-soon state; setup is paused)
   - `/dashboard/broadcasts` (Max broadcast panel, if enabled)
   - one public booking page at `/book/[slug]`
   - signed review page at `/reviews/[token]`
   - client booking manage link at `/client/[token]` (if enabled)
   - a test booking conflict attempt for the same staff/time
   - booking on a configured business holiday → API returns 409 / slot unavailable
   - double-submit the same public booking with the same `Idempotency-Key` → same booking returned
   - abandon a PayHere checkout → pending booking is cancelled after ~30 minutes by `expire-pending-bookings`

## Live stream demo loop

Run in order after deploy:

1. Register at `/register` — auto sign-in redirects to `/dashboard/setup`
2. Complete onboarding wizard → `{slug}.dinaya.lk` goes live and lists on `/discover`
3. Book as a client on `/book/{slug}` with a WhatsApp-capable phone
4. Confirm client + owner WhatsApp notifications in `communications`
5. Open `/dashboard/reports` — verify charts reflect the booking
6. Seed demo reactivation client: `npx tsx scripts/seed-reactivation-demo.ts <businessId> +94...`
7. Run **Run reactivation now** in `/dashboard/ai`

## Production safety notes

- Public booking writes must rely on the database overlap constraint, not only client-side checks.
- PayHere secrets are write-only from the dashboard and encrypted before storage.
- Webhook secrets are shown only once on creation.
- Plan config and platform announcements are stored in Postgres (`platform_settings`); a local `.dinaya/` mirror is used in development only.
- New Sri Lanka-local fields are backward-compatible and default to English / Asia/Colombo.
