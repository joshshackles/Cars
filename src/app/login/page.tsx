import Link from "next/link";
import { ArrowLeft, Info, LogIn, ShieldCheck } from "lucide-react";
import { signInAction } from "@/actions/auth-actions";
import { CarsLogo } from "@/components/brand/cars-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { demoLoginUsers } from "@/lib/auth/demo-users";
import { isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";
import { roleLabels } from "@/lib/auth/permissions";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const googleEnabled = isGoogleOAuthConfigured();
  const showError = Boolean(error && (googleEnabled || error !== "google-config"));

  return (
    <main className="min-h-screen bg-[#f7fbff] px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="w-fit text-cars-navy">
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            Back to public site
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="overflow-hidden rounded-lg">
            <div className="bg-cars-navy p-5 sm:p-6">
              <CarsLogo />
            </div>
            <CardHeader className="gap-2">
              <CardTitle className="text-3xl font-black text-cars-navy sm:text-4xl">Staff workspace sign in</CardTitle>
              <CardDescription>
                Open the CARS Dispatch operations workspace for your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {showError && error ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {getLoginErrorMessage(error)}
                </div>
              ) : null}
              {googleEnabled ? (
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/api/auth/google/start">
                    <ShieldCheck aria-hidden="true" />
                    Continue with Google
                  </Link>
                </Button>
              ) : (
                <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700">
                  <div className="flex gap-2">
                    <Info className="mt-0.5 size-4 shrink-0 text-cars-navy" aria-hidden="true" />
                    <p>
                      Google sign-in will appear here after OAuth credentials are added in Vercel.
                      Use a workspace account below for now.
                    </p>
                  </div>
                </div>
              )}
              <p className="text-sm leading-6 text-muted-foreground">
                Google sign-in validates your email against an existing organization membership
                or pending invitation.
              </p>
              <div className="rounded-md border bg-background p-3 text-sm">
                <p className="font-medium">Default organization</p>
                <p className="text-muted-foreground">Economic Security Corporation</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black text-cars-navy">Testing accounts</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Select a role below to preview the workspace while production auth is being finalized.
              </p>
            </div>
            {demoLoginUsers.map((user) => (
              <form key={user.email} action={signInAction}>
                <input type="hidden" name="email" value={user.email} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-4 rounded-lg border bg-white p-4 text-left shadow-sm transition-colors hover:border-cars-red hover:bg-[#f7fbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-semibold">{user.name}</span>
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                    <span className="text-sm leading-6 text-muted-foreground">{user.description}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 rounded-md bg-cars-red px-3 py-2 text-sm font-bold text-white">
                    {roleLabels[user.role]}
                    <LogIn className="size-4" aria-hidden="true" />
                  </span>
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function getLoginErrorMessage(error: string) {
  if (error === "invalid-account") {
    return "Select one of the available workspace accounts.";
  }

  if (error === "email-not-verified") {
    return "Google did not return a verified email address for that account.";
  }

  if (error === "google-state") {
    return "Google sign-in expired. Please try again.";
  }

  if (error === "google-config") {
    return "Google sign-in is not fully configured yet. Check the Google OAuth environment variables in Vercel.";
  }

  if (error === "google-token") {
    return "Google could not validate the sign-in callback. Check that the authorized redirect URI matches this app URL exactly.";
  }

  if (error === "google-profile") {
    return "Google sign-in succeeded, but the profile could not be validated. Please try again.";
  }

  return error;
}
