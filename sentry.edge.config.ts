import * as Sentry from "@sentry/nextjs";

// Edge-runtime error monitoring for dinaya.lk (Ardeno Studio Sentry org:
// ardeno-studio). Covers middleware / edge routes. The DSN comes from the
// SENTRY_DSN env var set in Vercel — it is never hardcoded or committed.
// Until that env var is set, Sentry stays inert (no DSN = no events sent).
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Error monitoring only — small trace sample to stay inside the free plan.
  tracesSampleRate: 0.1,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // PII is never sent by default in the Sentry JS SDK.
});
