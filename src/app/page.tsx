import Link from "next/link";
import { ArrowRight, CarFront, ClipboardList, Phone, ShieldCheck, Users } from "lucide-react";
import { CarsLogo } from "@/components/brand/cars-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  ["Rider intake", "Eligibility, notes, communication, and ride request capture.", Users],
  ["Dispatch board", "Daily assignments, exceptions, confirmations, and no-shows.", ClipboardList],
  ["Driver portal", "Mobile manifests, trip status, mileage, and issue reporting.", CarFront],
] as const;

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-[#f7fbff] text-cars-navy">
      <header className="border-b-4 border-cars-red bg-cars-navy">
        <div className="mx-auto flex min-h-24 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <CarsLogo />
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">
                Open workspace
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="border-b bg-white">
        <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div className="flex max-w-3xl flex-col gap-6">
            <div className="flex w-fit items-center gap-2 rounded-md border bg-[#f7fbff] px-3 py-2 text-sm font-semibold text-cars-navy">
              <ShieldCheck className="size-4 text-cars-red" aria-hidden="true" />
              Community Action Ride System
            </div>
            <div className="flex flex-col gap-4">
              <h1 className="text-5xl font-black tracking-tight text-cars-navy sm:text-6xl">
                Volunteer transportation dispatch, built for CARS.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Manage riders, drivers, trip assignments, mileage, reimbursements, reports, and organization
                settings for Economic Security Corporation.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login">
                  Log in to workspace
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Choose a demo role</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-5">
            <Card className="overflow-hidden rounded-lg">
              <div className="flex items-center justify-between bg-cars-red px-6 py-4 text-white">
                <div className="font-black">
                  <p className="font-serif text-2xl italic">Need A Ride?</p>
                  <p>CALL CARS!</p>
                </div>
                <div className="flex items-center gap-3 text-2xl font-black">
                  <Phone className="size-7" aria-hidden="true" />
                  417-438-2925
                </div>
              </div>
              <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
                {features.map(([title, description, Icon]) => (
                  <div key={title} className="flex flex-col gap-3 rounded-lg border bg-[#f7fbff] p-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-cars-navy text-white">
                      <Icon className="size-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-black text-cars-navy">{title}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Barton", "County"],
                ["Jasper", "County"],
                ["Newton", "County"],
                ["McDonald", "County"],
              ].map(([county, label]) => (
                <div key={county} className="rounded-lg border bg-white p-4 shadow-sm">
                  <p className="text-2xl font-black text-cars-navy">{county}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
