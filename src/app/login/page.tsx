import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>CARS Dispatch</CardTitle>
          <CardDescription>
            Authentication provider integration will be added here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            The application is already structured for protected routes, memberships, roles, and
            permissions. Local development uses the demo session configured in `.env`.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
