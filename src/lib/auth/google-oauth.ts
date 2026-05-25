import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessionCookieName } from "@/lib/auth/demo-users";

const googleStateCookieName = "cars_google_oauth_state";
const googleAuthBaseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const googleUserInfoUrl = "https://openidconnect.googleapis.com/v1/userinfo";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

export function isGoogleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function startGoogleSignIn(requestOrigin?: string) {
  assertGoogleOAuthConfigured();
  const state = randomBytes(24).toString("base64url");
  const cookieStore = await cookies();

  cookieStore.set(googleStateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getGoogleRedirectUri(requestOrigin),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  redirect(`${googleAuthBaseUrl}?${params.toString()}`);
}

export async function completeGoogleSignIn({
  code,
  state,
  requestOrigin,
}: {
  code: string | null;
  state: string | null;
  requestOrigin?: string;
}) {
  assertGoogleOAuthConfigured();
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(googleStateCookieName)?.value;
  cookieStore.delete(googleStateCookieName);

  if (!code || !state || !expectedState || state !== expectedState) {
    redirect("/login?error=google-state");
  }

  const token = await exchangeGoogleCode(code, requestOrigin);
  const profile = await getGoogleProfile(token);

  if (!profile.email_verified) {
    redirect("/login?error=email-not-verified");
  }

  const email = profile.email.trim().toLowerCase();
  const user = await upsertGoogleUser(profile, email);
  const membership = await db.membership.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { role: true },
  });

  if (!membership) {
    await acceptPendingInvitation(user.id, email);
  }

  const activeMembership = await db.membership.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { role: true },
  });

  if (!activeMembership) {
    redirect("/account-pending");
  }

  cookieStore.set(sessionCookieName, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect(activeMembership.role.key === "driver" ? "/driver-portal" : "/dashboard");
}

async function exchangeGoogleCode(code: string, requestOrigin?: string) {
  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getGoogleRedirectUri(requestOrigin),
      grant_type: "authorization_code",
    }),
  });

  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new GoogleOAuthError(
      "google-token",
      payload.error_description ?? payload.error ?? "Google authorization failed."
    );
  }

  return payload.access_token;
}

async function getGoogleProfile(accessToken: string) {
  const response = await fetch(googleUserInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new GoogleOAuthError("google-profile", "Google profile validation failed.");
  }

  return (await response.json()) as GoogleUserInfo;
}

async function upsertGoogleUser(profile: GoogleUserInfo, email: string) {
  const existingByGoogleSubject = await db.user.findUnique({
    where: { googleSubject: profile.sub },
  });

  if (existingByGoogleSubject) {
    return db.user.update({
      where: { id: existingByGoogleSubject.id },
      data: {
        email,
        name: profile.name ?? existingByGoogleSubject.name,
        imageUrl: profile.picture,
        emailVerifiedAt: new Date(),
      },
    });
  }

  return db.user.upsert({
    where: { email },
    update: {
      googleSubject: profile.sub,
      name: profile.name,
      imageUrl: profile.picture,
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      name: profile.name ?? email,
      googleSubject: profile.sub,
      imageUrl: profile.picture,
      emailVerifiedAt: new Date(),
    },
  });
}

async function acceptPendingInvitation(userId: string, email: string) {
  const invitation = await db.invitation.findFirst({
    where: {
      email,
      status: "PENDING",
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!invitation) {
    return;
  }

  await db.$transaction([
    db.membership.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invitation.organizationId,
        },
      },
      update: {
        roleId: invitation.roleId,
        deletedAt: null,
        updatedById: invitation.invitedById,
      },
      create: {
        userId,
        organizationId: invitation.organizationId,
        roleId: invitation.roleId,
        createdById: invitation.invitedById,
        updatedById: invitation.invitedById,
      },
    }),
    db.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        updatedById: userId,
      },
    }),
  ]);
}

export function getGoogleRedirectUri(requestOrigin?: string) {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? requestOrigin;
  if (!baseUrl) {
    throw new GoogleOAuthError(
      "google-config",
      "Set GOOGLE_REDIRECT_URI, APP_URL, or NEXTAUTH_URL for Google sign-in."
    );
  }

  return `${baseUrl.replace(/\/$/, "")}/api/auth/google/callback`;
}

function assertGoogleOAuthConfigured() {
  if (!isGoogleOAuthConfigured()) {
    throw new GoogleOAuthError("google-config", "Google OAuth is not configured.");
  }
}

export class GoogleOAuthError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "GoogleOAuthError";
  }
}
