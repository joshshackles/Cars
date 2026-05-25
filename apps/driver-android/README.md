# CARS Driver Native Android

This is the native Kotlin/Jetpack Compose Android client for CARS Dispatch.

It connects directly to the deployed CARS Dispatch mobile API and supports:

- Driver login with the CARS mobile access code
- Today's driver manifest
- Assignment acceptance and decline
- Turn-by-turn routing through Google Maps
- Fine/coarse GPS permission requests
- GPS mileage capture while the trip is active
- Arrived and completed trip status updates
- Driver issue reporting to dispatch

The Expo driver app remains in `apps/driver-mobile` as a reference client while this native app matures.

## Open in Android Studio

1. Open Android Studio.
2. Choose **Open**.
3. Select `apps/driver-android`.
4. Let Gradle sync.
5. Run the `app` configuration on an Android emulator or connected Android phone.

## API Base URL

The app defaults to:

```properties
carsApiBaseUrl=https://cars-oupxxfq6p-josh-shackles-projects.vercel.app
```

Override it in `gradle.properties` if you need to point at a preview deployment or local tunnel.

## Build

From `apps/driver-android`:

```powershell
.\gradlew.bat :app:assembleDebug
```

If Android Studio creates or upgrades the Gradle wrapper, commit the generated wrapper files.

## Notes

- This app launches Google Maps for best-route navigation, which avoids requiring a Google Maps SDK key for the MVP.
- GPS pings are sent to CARS Dispatch every 20 seconds or about every 45 meters while a trip is active.
- Mileage records are created by the platform when the driver completes the trip.
- Future production hardening should add encrypted session storage and a foreground location service for resilient tracking if drivers background the app during long rides.
