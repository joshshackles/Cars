"use client";

import { useEffect, useState } from "react";
import { appendGpsTrackPoint, getGpsTrackSnapshot } from "@/lib/driver-portal/gps-trip-storage";

type GpsTripTrackerProps = {
  assignmentId: string;
  active: boolean;
};

export function GpsTripTracker({ assignmentId, active }: GpsTripTrackerProps) {
  const [snapshot, setSnapshot] = useState(() => ({
    distanceMiles: 0,
    pointCount: 0,
    status: "GPS mileage tracking is ready.",
  }));

  useEffect(() => {
    if (!active) {
      return;
    }

    if (!navigator.geolocation) {
      setSnapshot((current) => ({
        ...current,
        status: "GPS tracking is not available in this browser.",
      }));
      return;
    }

    const current = getGpsTrackSnapshot(assignmentId);
    setSnapshot({
      distanceMiles: current.distanceMiles,
      pointCount: current.pointCount,
      status: "GPS mileage tracking is active.",
    });

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next = appendGpsTrackPoint(assignmentId, position);
        setSnapshot({
          distanceMiles: next.distanceMiles,
          pointCount: next.pointCount,
          status: "GPS mileage tracking is active.",
        });
      },
      () => {
        setSnapshot((current) => ({
          ...current,
          status: "Allow location access to keep automatic mileage accurate.",
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 20000,
        timeout: 20000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, assignmentId]);

  if (!active) {
    return null;
  }

  return (
    <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm text-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Automatic mileage</p>
          <p className="mt-1 leading-6">{snapshot.status}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-semibold">{snapshot.distanceMiles.toFixed(2)}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">tracked mi</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        {snapshot.pointCount} GPS {snapshot.pointCount === 1 ? "point" : "points"} captured.
      </p>
    </div>
  );
}
