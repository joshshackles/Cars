import { NextRequest } from "next/server";
import { completeGoogleSignIn } from "@/lib/auth/google-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  await completeGoogleSignIn({ code, state });
}
