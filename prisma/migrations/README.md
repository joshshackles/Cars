# Prisma Migrations

Generate local migrations with:

```bash
npm run db:migrate
```

Apply committed migrations in production with:

```bash
npx prisma migrate deploy
```

This workspace cannot generate a real migration history until the Prisma CLI is available and connected to PostgreSQL. Do not hand-edit production migration SQL; generate it from `prisma/schema.prisma`.
