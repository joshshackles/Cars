import { NextRequest, NextResponse } from "next/server";
import { getGoogleRedirectUri, isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const configured = isGoogleOAuthConfigured();
  let redirectUri: string | null = null;

  try {
    redirectUri = getGoogleRedirectUri(request.nextUrl.origin);
  } catch {
    redirectUri = null;
  }

  return NextResponse.json({
    configured,
    redirectUri,
    hasClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
    hasClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    hasExplicitRedirectUri: Boolean(process.env.GOOGLE_REDIRECT_URI),
  });
}
