import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AccessDeniedPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const params = (await searchParams) ?? {};
  const permission = getParam(params.permission);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Access denied"
        description="Your current role does not include permission to open this area."
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="flex flex-col gap-4 p-8 sm:flex-row sm:items-start">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-cars-red">
            <ShieldAlert className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-black text-cars-navy">This section is restricted</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              CARS Dispatch keeps staff, finance, driver, and partner workspaces separated by role. Ask an organization
              administrator to update your membership if you need access.
            </p>
            {permission ? (
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Missing permission: {permission}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
