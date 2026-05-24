import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configuredSecret = process.env.HEALTHCHECK_SECRET;

  if (configuredSecret) {
    const providedSecret =
      request.headers.get("x-healthcheck-secret") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (providedSecret !== configuredSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const env = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    directUrl: Boolean(process.env.DIRECT_URL),
    appUrl: Boolean(process.env.APP_URL),
    nextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
    authSecret: Boolean(process.env.NEXTAUTH_SECRET),
    nodeEnv: process.env.NODE_ENV ?? "unset",
  };
  const missingEnv = Object.entries(env)
    .filter(([key, value]) => key !== "nodeEnv" && !value)
    .map(([key]) => key);

  try {
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: missingEnv.length === 0,
        service: "cars-dispatch",
        database: "ok",
        env,
        missingEnv,
      },
      { status: missingEnv.length === 0 ? 200 : 503 }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "cars-dispatch",
        database: "unavailable",
        env,
        missingEnv,
      },
      { status: 503 }
    );
  }
}
