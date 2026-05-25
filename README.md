# CARS Dispatch

CARS Dispatch is a SaaS foundation for volunteer transportation operations. This scaffold uses Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui-style components, Prisma, and PostgreSQL.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui component conventions
- Prisma ORM
- PostgreSQL
- Zod validation

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Start PostgreSQL and update `DATABASE_URL` in `.env` if your local credentials differ.

4. Generate the Prisma client:

```bash
npm run db:generate
```

5. Create the initial database migration:

```bash
npm run db:migrate
```

6. Seed the default organization, roles, permissions, and test users:

```bash
npm run db:seed
```

7. Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## MVP Hardening

- QA checklist: `docs/QA_CHECKLIST.md`
- Deployment guide: `docs/DEPLOYMENT.md`
- Health check: `/api/health`

## Vercel + Neon Deployment

Use Neon pooled connections for app runtime and direct connections for Prisma migrations.

Required production variables:

- `DATABASE_URL`: Neon pooled URL, usually with `-pooler`, used by Prisma Client at runtime.
- `DIRECT_URL`: Neon direct URL, used by Prisma Migrate.
- `DATABASE_URL_UNPOOLED`: Neon/Vercel's direct unpooled URL. The Vercel build script uses this as `DIRECT_URL` when `DIRECT_URL` is not set.
- `APP_URL`: canonical deployed app URL.
- `NEXTAUTH_URL`: auth callback/base URL when NextAuth/Auth.js is enabled.
- `NEXTAUTH_SECRET`: strong random auth secret.
- `GOOGLE_CLIENT_ID`: Google OAuth web client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth web client secret.
- `GOOGLE_REDIRECT_URI`: Google OAuth redirect URI, for example `https://your-app.vercel.app/api/auth/google/callback`.
- `NEXT_PUBLIC_APP_NAME`: public app name.
- `HEALTHCHECK_SECRET`: optional secret for `/api/health`.
- `MOBILE_LOGIN_CODE`: optional shared access code for the Android driver app login while full password/auth-provider login is added.
- `CARS_SKIP_DB_BOOTSTRAP`: optional escape hatch. Leave `false` for a fresh Neon database; set `true` only when schema initialization is handled separately.
- `NODE_ENV`: set by Vercel.

Deployment flow:

1. Create a Neon project.
2. Copy the pooled Neon connection string into `DATABASE_URL`.
3. Copy the direct Neon connection string into `DIRECT_URL`. If Vercel created `DATABASE_URL_UNPOOLED` for you, that is also accepted by the build script.
4. Add auth/app variables to Vercel.
5. Deploy to Vercel. For the MVP bootstrap, the Vercel build runs `scripts/vercel-build.cjs`, which initializes the database with `prisma db push --skip-generate`, runs the production bootstrap, generates Prisma Client, and then runs `next build`.
6. For mature production releases, replace the bootstrap push with committed Prisma migrations and run `npm run prisma:deploy` from a trusted release environment.
7. Optionally seed demo data only with `ALLOW_PRODUCTION_SEED=true npm run db:seed`.
8. Verify production health at `/api/health`.

If a Vercel build fails before `next build`, confirm the Neon URLs are present. `DATABASE_URL` should be the pooled `-pooler` URL for runtime queries. `DIRECT_URL` or `DATABASE_URL_UNPOOLED` should be the direct non-pooler URL for schema work. The build script only falls back to `DATABASE_URL` when neither direct URL name is available.

See `docs/DEPLOYMENT.md` for the full checklist.

## Project Structure

```text
src/
  app/                 App Router routes, layouts, loading states, API routes
  actions/             Server actions
  components/          Reusable UI, shell, layout, and feature components
  config/              Navigation and product configuration
  lib/                 Database, auth, environment, and utility helpers
  schemas/             Zod validation schemas
  types/               Shared TypeScript types
prisma/
  schema.prisma        PostgreSQL schema and generated Prisma client config
  seed.ts              Default organization, role, permission, and user seed data
```

## Authentication And Authorization

The app is structured for multi-tenant authentication through memberships:

- `User` stores identity.
- `Organization` stores tenant ownership.
- `Membership` connects a user to an organization and a role.
- `Role` groups permissions for an organization.
- `Permission` stores reusable capability keys.
- `Invitation` is prepared for future invite flows.

Google authorization is available when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Configure a Google OAuth web application in Google Cloud Console and add this authorized redirect URI:

```text
https://YOUR_DOMAIN/api/auth/google/callback
```

For local development, use:

```text
http://localhost:3000/api/auth/google/callback
```

Google sign-in validates that Google returned a verified email address. If the email already belongs to a CARS user with an active membership, the user is signed in. If the email matches a pending invitation, the app creates/links the user and activates that membership. If there is no membership or invitation, the account is created for validation and routed to the pending account page.

To verify production Google configuration without exposing secrets, open:

```text
https://YOUR_DOMAIN/api/auth/google/status
```

The returned `redirectUri` must exactly match an authorized redirect URI in the Google OAuth client.

During local scaffold development, `src/lib/auth/session.ts` returns a demo user in the `Economic Security Corporation` organization. Change `CARS_DEMO_ROLE`, `CARS_DEMO_EMAIL`, and `CARS_DEMO_NAME` in `.env` to preview role-aware navigation and page access. Use `CARS_DEMO_ROLE=driver` and `CARS_DEMO_EMAIL=driver@esc.example` to preview the driver portal.

Supported roles:

- `system_admin`
- `organization_admin`
- `program_manager`
- `dispatcher`
- `finance_user`
- `driver`
- `reporting_viewer`
- `agency_partner`

Admin routes:

- `/admin`
- `/admin/users`
- `/admin/roles`
- `/admin/memberships`

Settings routes:

- `/settings`
- `/settings/edit`
- `/settings/validate`
- `/settings/audit`

Settings are organization-scoped `ProgramSetting` records, not hard-coded option arrays. Forms should use `getSettingOptions(organizationId, key)` or `getSettingValue(organizationId, key)` from `src/lib/settings/settings-service.ts` so valid values come from the database.

Rider module:

- Rider forms validate county and status against organization settings.
- Rider create/update actions write audit logs and status history.
- Sensitive notes require the `riders:sensitive:view` permission.

Driver module:

- Driver forms validate counties, preferred ride types, statuses, onboarding states, background check states, and reimbursement preferences against organization settings.
- Driver create/update and availability actions write audit logs and driver status history.
- Driver profiles show assigned/completed trips, mileage, reimbursements, incidents, documents, and availability.

Ride request intake:

- Staff can select an existing rider or create a rider during intake.
- Intake creates a `RideRequest` header and separate generated `TripLeg` records.
- One-way rides create one leg, return trips create outbound and return legs, and additional stops create extra legs.
- Intake warnings are stored on the request for short notice, out-of-county locations, missing contact info, and incomplete destinations.

Dispatch module:

- Daily and weekly command-center views show trip counts, assignment state, confirmations, completions, cancellations, no-shows, and urgent exceptions.
- Dispatch actions assign/reassign drivers, confirm rides, cancel rides, mark no-shows, and add notes.
- Driver assignment shows availability, county compatibility, document validity, and scheduling conflicts.
- Overrides require `dispatch:override` and an override reason, which is stored in audit metadata.
- Trip and assignment status changes write `StatusHistory` and `AuditLog` records.

Driver portal:

- `/driver-portal` is a mobile-first daily manifest for the signed-in driver's own assignments.
- Portal queries select approved rider notes only and omit sensitive rider notes, funding details, other drivers, and internal staff notes.
- Drivers can accept, decline, mark en route, mark arrived, complete, submit mileage, and report an issue.
- Declines and issue reports create dispatch-facing communication/audit records and move the trip to `NEEDS_ATTENTION`.

Mobile driver API foundation:

- Mobile clients authenticate with `POST /api/mobile/auth/login` and use `Authorization: Bearer <token>` for follow-up requests.
- Driver app endpoints are organization scoped and only return assignments for the authenticated driver's linked profile.
- `/api/mobile/driver/manifest` returns the signed-in driver's daily manifest for Android.
- `/api/mobile/assignments/:assignmentId/location` stores durable `DriverLocationPing` rows for GPS mileage tracking.
- Start, arrive, complete, decline, and issue-report endpoints create audit/status records and keep dispatch visibility aligned with the web portal.

Android driver app:

- `apps/driver-mobile` contains the Expo Android MVP for Google Play/internal testing.
- The app includes mobile login, daily manifest, Google Maps route launch, foreground GPS tracking, trip status actions, rider calling, decline, and issue reporting.
- The app is isolated from the Vercel web build through root TypeScript/ESLint excludes.
- Google Play release notes, Data safety guidance, and review checklist live in `docs/GOOGLE_PLAY_RELEASE.md` and `apps/driver-mobile/PRIVACY.md`.
- `apps/driver-android` contains the native Kotlin/Jetpack Compose Android Studio client. It uses the same mobile API, requests Android location permissions, launches Google Maps for best-route navigation, and submits GPS pings for mileage records.
- Native Android setup notes live in `docs/NATIVE_ANDROID_APP.md`.

Mileage and reimbursement module:

- Completed assigned trips create starter `MileageRecord` rows with estimated miles and the organization reimbursement rate.
- Driver-submitted mileage captures submitted miles, calculates reimbursement, and moves records into finance review.
- Finance users with manage permissions can approve, reject, adjust with required reasons, batch reimbursements, mark batches paid, and export CSV files.
- Reimbursement batches are driver-scoped and track date range, trip count, approved miles, rate, total amount, approval date, payment status, and payment date.

Reports module:

- `/reports` provides operational dashboard cards, bar charts, driver activity, reimbursement totals, and CSV export.
- Reports are generated from operational data only: riders, ride requests, trip legs, assignments, destinations, mileage, reimbursements, funding sources, and drivers.
- Filters include date range, county, ride purpose, funding source, driver, rider status, and destination type.

## Routes

- `/` Dashboard
- `/riders`
- `/riders/new`
- `/riders/[riderId]`
- `/riders/[riderId]/edit`
- `/drivers`
- `/drivers/new`
- `/drivers/[driverId]`
- `/drivers/[driverId]/edit`
- `/ride-requests`
- `/ride-requests/new`
- `/dispatch`
- `/dispatch/weekly`
- `/driver-portal`
- `/mileage`
- `/mileage/pending`
- `/mileage/approved`
- `/mileage/rejected`
- `/mileage/drivers`
- `/reimbursements`
- `/reimbursements/batches`
- `/reports`
- `/reports/export`
- `/incidents`
- `/settings`
- `/admin`

## Notes

This is intentionally a clean product scaffold. Implemented workflows are still narrow and demo-friendly, but the data model, permissions, server actions, and route structure are organized for production expansion.
