# CARS Driver Mobile API

Base URL: the deployed CARS Dispatch `APP_URL`.

All protected endpoints require:

```http
Authorization: Bearer <mobile-session-token>
Content-Type: application/json
```

## Authentication

### `POST /api/mobile/auth/login`

Request:

```json
{
  "email": "driver@esc.example",
  "deviceName": "Pixel 8",
  "accessCode": "optional-shared-code"
}
```

Response includes a bearer token, expiry, user, organization, and linked driver profile.
If `MOBILE_LOGIN_CODE` is set, `accessCode` must match it.

### `POST /api/mobile/auth/logout`

Revokes the bearer token used for the request.

## Driver

### `GET /api/mobile/driver/me`

Returns the authenticated user, organization, and linked driver profile.

### `GET /api/mobile/driver/manifest?date=YYYY-MM-DD`

Returns the authenticated driver's assignments for the requested date.

## Assignments

### `POST /api/mobile/assignments/:assignmentId/accept`

Accepts an offered assignment and moves the trip to driver confirmed.

### `POST /api/mobile/assignments/:assignmentId/decline`

Request:

```json
{
  "reason": "Vehicle unavailable"
}
```

Declines the assignment, notifies dispatch, and moves the trip into attention.

### `POST /api/mobile/assignments/:assignmentId/start`

Request:

```json
{
  "routeUrl": "https://www.google.com/maps/dir/?api=1&origin=...",
  "location": {
    "latitude": 37.0842,
    "longitude": -94.5133,
    "accuracyMeters": 12.4,
    "speedMetersPerSecond": 0,
    "headingDegrees": 180,
    "capturedAt": "2026-05-22T15:00:00.000Z"
  }
}
```

Creates the first durable GPS ping and moves the trip to en route.

### `POST /api/mobile/assignments/:assignmentId/location`

Stores a GPS ping while the trip is active.

### `POST /api/mobile/assignments/:assignmentId/arrived`

Optionally accepts a `location` payload and moves the trip to arrived.

### `POST /api/mobile/assignments/:assignmentId/complete`

Requires a final `location` payload. Creates a mileage record from stored GPS pings.

### `POST /api/mobile/assignments/:assignmentId/report-issue`

Request:

```json
{
  "summary": "Rider not at pickup",
  "details": "Waited 10 minutes and called twice."
}
```

Creates an incident/communication record and moves the trip into attention.
