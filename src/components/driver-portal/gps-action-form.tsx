"use client";

import { useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appendGpsTrackPoint, readGpsTrackPayload } from "@/lib/driver-portal/gps-trip-storage";

type GpsActionFormProps = {
  action: (formData: FormData) => Promise<void>;
  assignmentId: string;
  children: ReactNode;
  className?: string;
  helpText?: string;
  routeUrl?: string;
  trackingMode?: "start" | "stop";
};

export function GpsActionForm({
  action,
  assignmentId,
  children,
  className,
  helpText = "Uses your current GPS location for trip tracking and mileage.",
  routeUrl,
  trackingMode,
}: GpsActionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function requestLocationAndSubmit() {
    setMessage("Requesting GPS location...");

    if (!navigator.geolocation) {
      setMessage("GPS is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const form = formRef.current;

        if (!form) {
          return;
        }

        setHiddenValue(form, "latitude", position.coords.latitude.toString());
        setHiddenValue(form, "longitude", position.coords.longitude.toString());
        setHiddenValue(form, "accuracy", position.coords.accuracy.toString());
        appendGpsTrackPoint(assignmentId, position, trackingMode === "start");
        setHiddenValue(form, "gpsTrack", readGpsTrackPayload(assignmentId));
        setHiddenValue(form, "routeUrl", routeUrl ?? "");
        setMessage("GPS captured. Updating trip...");
        startTransition(() => form.requestSubmit());
      },
      () => {
        setMessage("Location permission is required to update trip progress.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 15000,
      }
    );
  }

  return (
    <form ref={formRef} action={action} className={className}>
      <input type="hidden" name="latitude" />
      <input type="hidden" name="longitude" />
      <input type="hidden" name="accuracy" />
      <input type="hidden" name="gpsTrack" />
      <input type="hidden" name="routeUrl" />
      <Button
        type="button"
        className="h-12 w-full text-base"
        disabled={isPending}
        onClick={requestLocationAndSubmit}
      >
        {children}
      </Button>
      <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600">
        <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
        {message ?? helpText}
      </p>
    </form>
  );
}

function setHiddenValue(form: HTMLFormElement, name: string, value: string) {
  const field = form.elements.namedItem(name);

  if (field instanceof HTMLInputElement) {
    field.value = value;
  }
}
