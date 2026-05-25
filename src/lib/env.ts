import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
  APP_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default("CARS Dispatch"),
  HEALTHCHECK_SECRET: z.string().optional(),
  ALLOW_PRODUCTION_SEED: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  APP_URL: process.env.APP_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  HEALTHCHECK_SECRET: process.env.HEALTHCHECK_SECRET,
  ALLOW_PRODUCTION_SEED: process.env.ALLOW_PRODUCTION_SEED,
  NODE_ENV: process.env.NODE_ENV,
});
