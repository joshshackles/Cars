import { NextRequest, NextResponse } from "next/server";
import { completeGoogleSignIn, GoogleOAuthError } from "@/lib/auth/google-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  try {
    await completeGoogleSignIn({ code, state, requestOrigin: request.nextUrl.origin });
  } catch (error) {
    if (error instanceof GoogleOAuthError) {
      return NextResponse.redirect(new URL(`/login?error=${error.code}`, request.url));
    }

    throw error;
  }
}
