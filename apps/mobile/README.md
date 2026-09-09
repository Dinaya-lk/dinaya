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
- Create and edit clients (notes + stage), services, staff, locations, and weekly availability + overrides.
- Reply to reviews, toggle automations, pause/reactivate deals, send or test broadcasts, trigger AI reactivation, edit the business profile, and load reports for 7 / 30 / 90 days.

## Still opened in the browser

PayHere checkout, provider OAuth, billing changes, and API-key management stay web fallbacks. Those need browser cookies or PCI/OAuth redirects.

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

## Next

Android FCM device registration for new-booking and reminder pushes, after a Firebase project and `google-services.json` are in place.
