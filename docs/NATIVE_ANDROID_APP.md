# Native Android Driver App

The CARS Dispatch native Android app lives in `apps/driver-android`.

## Why Native Kotlin

The Kotlin version gives the driver portal a stronger foundation for:

- Android Studio builds
- Google Play release management
- device GPS permission handling
- durable trip-mileage capture
- native Google Maps handoff
- future foreground-service tracking

## Current MVP Scope

The native app connects to the existing `/api/mobile/*` API surface:

- `POST /api/mobile/auth/login`
- `GET /api/mobile/driver/manifest`
- assignment accept, decline, start, location, arrived, complete, and report-issue actions

It does not replace the web driver portal or Expo app yet. It is a parallel native client that can be tested and matured safely.

## Android Studio Setup

Open:

```text
apps/driver-android
```

Then let Android Studio sync Gradle and install any missing Android SDK packages it requests.

## Google Play Path

1. Verify login and manifest on a physical Android phone.
2. Confirm location permissions and GPS pings on an assigned trip.
3. Generate a signed release build in Android Studio.
4. Upload the AAB to Google Play Console internal testing.
5. Test with real driver accounts before production rollout.

## Follow-up Hardening

- Add encrypted session storage using AndroidX Security Crypto.
- Add a foreground service so GPS tracking continues when the app is backgrounded.
- Add embedded route preview with Google Maps SDK if CARS wants in-app mapping instead of Google Maps handoff.
- Add crash reporting and structured mobile telemetry.
