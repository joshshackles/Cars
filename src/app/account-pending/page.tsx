import Link from "next/link";
import { CarsLogo } from "@/components/brand/cars-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPendingPage() {
  return (
    <main className="min-h-screen bg-[#f7fbff] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="rounded-lg bg-cars-navy p-6">
          <CarsLogo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-black text-cars-navy">
              Account validation pending
            </CardTitle>
            <CardDescription>
              Your Google email was verified, but it is not connected to an active CARS
              organization membership yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Ask an organization admin to create or resend an invitation for the same Google
              email address. Once accepted, Google sign-in will open the correct CARS workspace.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/login">Back to login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Public site</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
