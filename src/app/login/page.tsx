import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { signInAction } from "@/actions/auth-actions";
import { CarsLogo } from "@/components/brand/cars-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { demoLoginUsers } from "@/lib/auth/demo-users";
import { roleLabels } from "@/lib/auth/permissions";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <main className="min-h-screen bg-[#f7fbff] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Button asChild variant="ghost" className="w-fit text-cars-navy">
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            Back to public site
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="overflow-hidden rounded-lg">
            <div className="bg-cars-navy p-6">
              <CarsLogo />
            </div>
            <CardHeader>
              <CardTitle className="text-3xl font-black text-cars-navy">Log in to CARS Dispatch</CardTitle>
              <CardDescription>
                Choose a seeded workspace account to open the role-aware MVP.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {error ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Select one of the available workspace accounts.
                </div>
              ) : null}
              <p className="text-sm leading-6 text-muted-foreground">
                This is a demo login for the production preview. A real identity provider can replace it
                without changing the permission model, protected routes, or organization scoping.
              </p>
              <div className="rounded-md border bg-background p-3 text-sm">
                <p className="font-medium">Default organization</p>
                <p className="text-muted-foreground">Economic Security Corporation</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3">
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
