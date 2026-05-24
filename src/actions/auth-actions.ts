"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoLoginEmail, sessionCookieName } from "@/lib/auth/demo-users";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!isDemoLoginEmail(email)) {
    redirect("/login?error=invalid-account");
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect(email === "driver@esc.example" ? "/driver-portal" : "/dashboard");
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);

  redirect("/");
}
