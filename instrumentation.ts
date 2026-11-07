import * as Sentry from "@sentry/nextjs";

// Registers Sentry for the Node.js and Edge runtimes (Next.js 16:
// instrumentation is stable, no experimental flag needed). The matching
// client config (sentry.client.config.ts) is loaded automatically by
// @sentry/nextjs. No DSN env var set = Sentry stays inert.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
