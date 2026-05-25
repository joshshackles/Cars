# CARS Dispatch Vercel + Neon Deployment

This app is prepared for Vercel hosting, Neon PostgreSQL, Prisma ORM, and Next.js App Router.

## Required Production Environment Variables

Set these in Vercel for Production, Preview, and Development as appropriate.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon pooled connection string for runtime queries. Use the host with `-pooler` and `sslmode=require`. |
| `DIRECT_URL` | Recommended | Neon direct connection string for Prisma migrations. Do not use the pooler host for migrations. If unset, `DATABASE_URL_UNPOOLED` is used by the build helper. |
| `DATABASE_URL_UNPOOLED` | Optional | Vercel/Neon's direct unpooled URL. Used automatically as `DIRECT_URL` by the build script when `DIRECT_URL` is missing. |
| `APP_URL` | Yes | Canonical deployed app URL, for example `https://cars-dispatch.example.org`. |
| `NEXTAUTH_URL` | Yes when using NextAuth/Auth.js | Auth callback/base URL. Match `APP_URL` unless your auth provider needs a different value. |
| `NEXTAUTH_SECRET` | Yes | Strong random auth/session secret. Generate with `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_NAME` | Yes | Public app display name, usually `CARS Dispatch`. |
| `HEALTHCHECK_SECRET` | Recommended | Optional bearer/header secret for `/api/health`. |
| `ALLOW_PRODUCTION_SEED` | Optional | Must be `true` to run demo seed in production. Keep unset or `false` normally. |
| `CARS_AUTO_DB_BOOTSTRAP` | Optional | Must be `true` to let the helper run `prisma db push` and production bootstrap. Keep unset or `false` for normal Vercel builds. |
| `CARS_ACCEPT_DB_PUSH_WARNINGS` | Optional | Must be `true` to pass Prisma's `--accept-data-loss` flag after reviewing warnings. Keep unset or `false` normally. |
| `NODE_ENV` | Vercel managed | Vercel sets this to `production`. |

Temporary scaffold auth variables are still supported until production auth is wired:

| Variable | Purpose |
| --- | --- |
| `CARS_DEMO_ROLE` | Demo role key, such as `organization_admin` or `driver`. |
| `CARS_DEMO_EMAIL` | Demo user email that should match a real seeded user. |
| `CARS_DEMO_NAME` | Demo display name fallback. |

## Neon Setup

1. Create a Neon project.
2. Open the Neon connection modal.
3. Copy the pooled connection string for `DATABASE_URL`.
   - It should use the pooled host, typically containing `-pooler`.
   - Keep `sslmode=require`.
   - If Neon includes `channel_binding=require`, keep it if your environment supports it.
4. Copy the direct connection string for `DIRECT_URL`, or keep Vercel/Neon's generated `DATABASE_URL_UNPOOLED`.
   - It should not use the `-pooler` host.
   - This is the connection Prisma Migrate uses for DDL.
5. Add both values to Vercel environment variables.

## Prisma

The Prisma datasource is configured for Neon/Vercel:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Runtime queries use `DATABASE_URL`. Prisma migrations use `DIRECT_URL`; on Vercel, `DATABASE_URL_UNPOOLED` is accepted as a fallback direct URL.

Useful scripts:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:studio
npm run db:seed
```

## Production Migration Flow

Do not run destructive or development migrations automatically in production. Normal Vercel builds do not mutate the database.

Recommended release flow:

1. Commit generated Prisma migrations from local development.
2. Before deploying app code, run:

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
```

3. Deploy to Vercel.

For the current MVP, this repository does not yet contain committed migration folders. To initialize or sync a Neon database deliberately, run the bootstrap helper from a trusted shell with production environment variables available:

```bash
CARS_AUTO_DB_BOOTSTRAP=true npm run vercel-build -- --db-only
```

If Prisma prints a reviewed warning, such as adding a new unique constraint to existing data, rerun only after confirming the impact:

```bash
CARS_AUTO_DB_BOOTSTRAP=true CARS_ACCEPT_DB_PUSH_WARNINGS=true npm run vercel-build -- --db-only
```

The Vercel build command intentionally runs only:

```bash
npm run vercel-build
```

That script runs Prisma Client generation and `next build`; it does not run `prisma migrate deploy` or mutate the database unless `CARS_AUTO_DB_BOOTSTRAP=true` is explicitly set.

## Optional Demo Seed

For local development:

```bash
npm run db:seed
```

For production, seed is blocked unless you explicitly set:

```bash
ALLOW_PRODUCTION_SEED=true
```

Use this only for an intentional demo environment.

## Vercel Deployment Steps

1. Create the Neon database.
2. Add `DATABASE_URL` using the pooled Neon URL.
3. Add `DIRECT_URL` using the direct Neon URL, or verify `DATABASE_URL_UNPOOLED` exists.
4. Add `APP_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `NEXT_PUBLIC_APP_NAME`.
5. Add `HEALTHCHECK_SECRET` if the health route should be protected.
6. Run `npm run prisma:deploy` from a trusted release environment once committed migrations exist. For the current MVP schema-sync path, use the deliberate bootstrap helper above.
7. Optionally run `ALLOW_PRODUCTION_SEED=true npm run db:seed` for demo data.
8. Deploy to Vercel.
9. Verify `/api/health` with the health secret if configured.

## Runtime Compatibility

- Prisma is used only from Node.js runtime server components, route handlers, and server actions.
- Prisma-backed route handlers export `runtime = "nodejs"`.
- The dashboard and driver portal are dynamic Node.js surfaces to avoid build-time database dependency.
- Avoid long-running transactions on Neon pooled connections; current workflows use short single-operation writes and targeted reads.

## Release Smoke Test

- `/api/health` returns OK and `database: "ok"` without exposing secrets.
- `/` loads for an organization admin.
- `/driver-portal` loads only for a driver user.
- `/dispatch` shows seeded trips.
- `/mileage/pending`, `/mileage/approved`, and `/reimbursements/batches` load for finance users.
- `/reports` renders summary cards and charts.
- CSV exports download from mileage, reimbursements, and reports routes.

## Production Auth Note

`src/lib/auth/session.ts` is still a demo-session adapter that resolves a seeded user by environment-configured email. Replace it with the production auth provider before handling real users. Keep the `MembershipContext` shape and permission checks so route protection and organization scoping continue to work.
