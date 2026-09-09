# Dinaya Android Mobile App

Dinaya ships Android in two layers without duplicating the whole product.

## Phase 1: Public Booking App

Use the existing web booking/discovery flow as a Play Store PWA/TWA candidate.

Current foundation:

- `src/app/manifest.ts` exposes a standalone app manifest.
- `public/sw.js` registers a conservative service worker.
- `src/app/api/pwa-icon/[size]/route.ts` serves 192px and 512px PNG icons for Android install surfaces.

Before a Play Store build:

- Add `public/.well-known/assetlinks.json` after the Android package name and signing certificate fingerprint are known.
- Package with Bubblewrap or an equivalent Trusted Web Activity workflow.
- Validate installability with Lighthouse and Android Digital Asset Links.
- Smoke test booking, deal links, payment fallback, and review flows on a real Android device.

## Phase 2: Merchant Dashboard App

`apps/mobile` is a Kotlin + Jetpack Compose app for salon owners. It is not a port of the Windows Tauri shell.

### API

- Primary: `/api/v1/mobile/*` with `X-Dinaya-Mobile: 1`.
- Login (`POST /api/v1/mobile/auth/login`) issues `mobile` keys (`mobile:read`, `mobile:bookings`, `mobile:write`). Responses include both `mobileKey` and `desktopKey` (same value) for older builds.
- Write routes are implemented once on `/api/v1/desktop/*` and re-exported as thin mobile aliases.
- Device keys are stored in Android Keystore, not web storage.

### Native writes

Native writes cover:

- Walk-in bookings: create, **reschedule**, and cancel (slot pick stays in-app).
- Clients, services, staff, locations, availability.
- Review replies, automation toggles, settings profile, reports range presets (`7d` / `30d` / `90d`).
- **Deals:** create and edit natively (service, discount, and time windows), plus pause/reactivate.
- **Broadcasts:** draft natively (name, channel, body, audience), then send or test from the app.

### Still browser (by design)

The app does not invent these locally. Connect and billing copy reads **Opens dinaya.lk in your browser**:

- PayHere checkout (pending payments deep-link to hosted checkout; no in-app PayHere)
- Provider OAuth connect
- Billing (upgrade / downgrade / card)
- API-key management

Android FCM device registration for new-booking and reminder pushes is still future work.

### App shell

1. Email/password sign-in through the mobile auth endpoint.
2. Bottom tabs for Home, Calendar, Bookings, Clients; More sheet for catalog, growth, and configure.
3. Native create sheets for bookings, clients, services, staff, locations, deals, and broadcasts.
4. Dinaya web design language: blue primary actions, warm auth background, white cards, slate type, booking status accents, Dinaya.lk mark.

Local project:

- `apps/mobile/README.md`
- `apps/mobile/app/src/main/java/lk/dinaya/mobile/`

## Not recommended as the first path

Do not treat `apps/desktop` as a drop-in Android app. It is a Windows-focused Tauri shell with tray behavior, global shortcuts, desktop notifications, NSIS release output, and OS keyring assumptions.
