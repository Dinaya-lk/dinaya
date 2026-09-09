# Dinaya Android

Native Android app foundation for Dinaya merchant workflows.

## Shape

- Kotlin + Jetpack Compose app under `apps/mobile/app`.
- Package name: `lk.dinaya.mobile`.
- Uses the existing bearer-device API contract initially through `/api/v1/desktop/*`.
- Stores the issued device key with Android Keystore backed AES-GCM encryption.
- Keeps the Gradle project independent from the Next.js web app and the Tauri Windows app.

## Current Scope

- Email/password sign-in against `/api/v1/desktop/auth/login`.
- Secure local device-key session.
- Bootstrap fetch from `/api/v1/desktop/bootstrap`.
- Full merchant dashboard shell with the same major workspace groups as the web and Windows apps: Workspace, Catalog, Growth, and Configure.
- Native dashboard sections for overview, calendar, bookings, clients, services, staff, locations, availability, reviews, payments, marketing, deals, broadcasts, AI Hub, reports, integrations, automations, billing, and settings.
- Generic typed-response adapter for the existing desktop dashboard API, so list-style endpoints render as native metric cards and module cards.
- Today bookings fetch from `/api/v1/desktop/bookings?tab=today`.
- Safe booking status updates against `/api/v1/desktop/bookings/:id/status`.
- Web fallback buttons for advanced flows such as PayHere checkout, OAuth/provider setup, billing changes, and deeper CRUD screens that are not native yet.
- Logout and local session clearing.
- Native Compose UI themed to match the Dinaya web app: `Dinaya.lk` logo mark, blue primary actions, warm auth background, white rounded dashboard cards, slate typography, and matching booking status colors.

## Current Debug APK

The latest local debug artifact is copied here for phone testing:

```powershell
deliverables\android\Dinaya-Mobile-debug.apk
```

SHA-256:

```text
BDFFCC7B7CF6028C467F2D01A18175081F9D76CB02A55C54B91EBCE17E31AF19
```

## Local Build

Open `apps/mobile` in Android Studio, or run Gradle from this directory:

```powershell
.\gradlew.bat :app:lintDebug :app:testDebugUnitTest :app:assembleDebug
```

This checkout currently has `local.properties` pointed at the shared SDK already present on this machine:

```text
C:/Users/suven/Desktop/OneDriveBackupFiles/Documents/ARDENO STUDIO/MUSIC APP/android_sdk
```

The debug APK is created at:

```powershell
app\build\outputs\apk\debug\app-debug.apk
```

For emulator local API testing, pass a base URL at build time:

```powershell
.\gradlew.bat :app:assembleDebug -PdinayaApiBaseUrl=http://10.0.2.2:3000
```

For a phone build against the current deployed Dinaya app, use the default base URL:

```powershell
.\gradlew.bat :app:assembleDebug
```

The default debug build points at `https://dinaya-lk.vercel.app` because that host was reachable from the connected test phone.

## Next Backend Step

The app currently reuses the desktop API surface to avoid duplicating server contracts before the client compiles. The next backend pass should introduce mobile-native semantics:

- `mobile` API key type.
- `mobile:read`, `mobile:bookings`, and `mobile:write` scopes.
- `/api/v1/mobile/*` route aliases or shared route handlers.
- `X-Dinaya-Mobile` request marker in logs and rate-limit suffixes.
- Android FCM device registration after the first dashboard slice is stable.
