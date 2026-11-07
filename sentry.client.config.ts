import * as Sentry from "@sentry/nextjs";

// Client-side error monitoring for dinaya.lk (Ardeno Studio Sentry org:
// ardeno-studio). The DSN comes from the NEXT_PUBLIC_SENTRY_DSN env var
// set in Vercel — it is never hardcoded or committed. Until that env var
// is set, Sentry stays inert (no DSN = no events sent).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Error monitoring only — no session replay, no performance traces
  // beyond a small sample, to stay inside the free plan.
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // PII is never sent by default in the Sentry JS SDK.
});
