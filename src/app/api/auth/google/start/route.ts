import { NextRequest, NextResponse } from "next/server";
import { GoogleOAuthError, startGoogleSignIn } from "@/lib/auth/google-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await startGoogleSignIn(request.nextUrl.origin);
  } catch (error) {
    if (error instanceof GoogleOAuthError) {
      return NextResponse.redirect(new URL(`/login?error=${error.code}`, request.url));
    }

    throw error;
  }
}
