# Dinaya Android

Native Android merchant app for Dinaya — today’s book, catalog, and growth workflows on phone.

## Shape

- Kotlin + Jetpack Compose under `apps/mobile/app`.
- Package name: `lk.dinaya.mobile`.
- Talks to `/api/v1/mobile/*` first (`X-Dinaya-Mobile: 1`). Desktop `/api/v1/desktop/*` is a 404 fallback so older servers keep working.
- Login issues `keyType: "mobile"` keys (`mobile:read`, `mobile:bookings`, `mobile:write`). The client prefers `mobileKey`, then `desktopKey`.
- Device keys sit in Android Keystore-backed AES-GCM storage.
- Gradle project is independent from the Next.js web app and the Tauri Windows app.

## Native ops (no web dashboard required)

- Sign in, bootstrap, overview, calendar (day/week), bookings search + status filter.
- Create / confirm / complete / no-show / cancel bookings, including walk-in create with slot checks.
- Reschedule a booking in-app (pick a new slot; no browser hop).
- Create and edit clients (notes + stage), services, staff, locations, and weekly availability + overrides.
- Reply to reviews, toggle automations, pause/reactivate deals, trigger AI reactivation, edit the business profile, and load reports for 7 / 30 / 90 days.
- **Deals:** create natively — choose the service, discount, and time windows.
- **Broadcasts:** draft natively (name, channel, body, audience), then send or test from the app.

## Still opened in the browser

These stay on dinaya.lk by design. They need browser cookies, PCI, or OAuth redirects — the app does not fake them locally:

- PayHere checkout (pending payments open the hosted checkout; there is no in-app PayHere flow)
- Provider OAuth connect (Integrations → Connect)
- Billing changes (upgrade / downgrade / card)
- API-key management

Connect and billing rows say **Opens dinaya.lk in your browser**.

## Local build

Open `apps/mobile` in Android Studio, or run Gradle from this directory:

```powershell
.\gradlew.bat :app:lintDebug :app:testDebugUnitTest :app:assembleDebug
```

For emulator traffic to a local Next.js server:

```powershell
.\gradlew.bat :app:assembleDebug -PdinayaApiBaseUrl=http://10.0.2.2:3002
```

Debug default API host is `https://dinaya-lk.vercel.app` unless you pass `-PdinayaApiBaseUrl`. APK output:

```text
app/build/outputs/apk/debug/app-debug.apk
```

Version **0.3.4** adds Apple-style springs (tabs, section changes, press scale 0.96), staggered list enters, liquid-glass chrome that content can scroll under, and translucent sheets. Animations honor Android animator duration scale (reduced motion).

## Next

Android FCM device registration for new-booking and reminder pushes remains future work, after a Firebase project and `google-services.json` are in place.
