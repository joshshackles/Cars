# CARS Driver Google Play Release Checklist

## 1. Production Environment

- Confirm CARS Dispatch is deployed and healthy.
- Set `MOBILE_LOGIN_CODE` in Vercel for mobile test/review access.
- Confirm `/api/mobile/auth/login` returns a token for the test driver.
- Run the mobile API smoke test:

```bash
cd apps/driver-mobile
CARS_API_BASE_URL=https://carsdispatch.vercel.app CARS_DRIVER_EMAIL=driver@esc.example MOBILE_LOGIN_CODE=<code> npm run release:check
```

## 2. Expo/EAS Setup

```bash
npm install -g eas-cli
cd apps/driver-mobile
npm install
eas login
eas project:init
```

## 3. Android Build

Internal APK for direct tester install:

```bash
eas build --platform android --profile preview
```

Google Play AAB:

```bash
eas build --platform android --profile production
```

The app config targets Android SDK 36 through `expo-build-properties`.

## 4. Google Play Console

- Create app: **CARS Driver**.
- Choose default language and app/contact details.
- Upload production `.aab` to an internal testing track first.
- Enable Play App Signing.
- Add review credentials from `apps/driver-mobile/PLAY_STORE_LISTING.md`.
- Complete content rating.
- Complete Data safety using `apps/driver-mobile/PRIVACY.md`.
- Add privacy policy URL.
- Add app icon, feature graphic, screenshots, and phone screenshots.

## 5. Data Safety Guidance

Disclose:

- Location: collected while app is in use for trip mileage and operations.
- Personal info: name/email for account identity.
- App activity: trip actions and issue reports.
- App info/performance if crash analytics are added later.

Do not claim background location unless that permission is intentionally added in a later release.

## 6. Release QA

- Driver can sign in.
- Manifest loads for today.
- Driver can open route.
- Driver can accept an offered assignment.
- Start trip requests location permission.
- Location pings are sent while active.
- Arrived action works.
- Complete trip creates mileage.
- Decline creates dispatch attention.
- Report issue creates dispatch attention.
- Sign out revokes the token.

## 7. Post-Review Cleanup

- Rotate `MOBILE_LOGIN_CODE`.
- Remove or disable any temporary review-only driver account.
- Verify production logs for mobile API errors.
