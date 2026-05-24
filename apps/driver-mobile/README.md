# CARS Driver Mobile

Android-first Expo app for CARS Dispatch drivers.

## What It Does

- Signs drivers in against the CARS Dispatch mobile API.
- Shows the driver's daily manifest.
- Opens Google Maps turn-by-turn navigation.
- Starts foreground GPS tracking when a trip starts.
- Sends location pings to `/api/mobile/assignments/:assignmentId/location`.
- Marks arrived and completed.
- Completes trips with automatic GPS mileage.
- Lets drivers call riders, decline assignments, and report issues.

## Local Setup

```bash
cd apps/driver-mobile
npm install
npx expo start
```

The app reads the API base URL from `app.json`:

```json
{
  "extra": {
    "apiBaseUrl": "https://carsdispatch.vercel.app"
  }
}
```

For production or internal test builds, set `MOBILE_LOGIN_CODE` in the CARS Dispatch Vercel environment and share that code only with test drivers until a full auth provider is connected.

## Android Build

```bash
npm install -g eas-cli
cd apps/driver-mobile
eas login
eas build --platform android --profile preview
```

Production Google Play upload should use:

```bash
eas build --platform android --profile production
```

The Expo config targets Android SDK 36 through `expo-build-properties`, satisfying the current Play target API requirement for new apps.

## Release Check

After setting `MOBILE_LOGIN_CODE` in the deployed CARS Dispatch environment, run:

```bash
CARS_API_BASE_URL=https://carsdispatch.vercel.app CARS_DRIVER_EMAIL=driver@esc.example MOBILE_LOGIN_CODE=<code> npm run release:check
```

## Play Store Prep

- `PRIVACY.md` contains a draft privacy/Data safety summary.
- `PLAY_STORE_LISTING.md` contains draft listing copy and reviewer notes.
- `../../docs/GOOGLE_PLAY_RELEASE.md` contains the release checklist.

## GPS Privacy Note

The MVP uses foreground location only. Drivers intentionally start GPS tracking when they start a trip, and tracking stops after trip completion or sign-out.
