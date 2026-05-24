"use client";

const maxTrackPoints = 240;
const minPointDistanceMiles = 0.03;
const trackVersion = 1;

export type GpsTrackPoint = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
};

export type GpsTrackSnapshot = {
  distanceMiles: number;
  lastPoint: GpsTrackPoint | null;
  pointCount: number;
  startedAt: string | null;
  track: GpsTrackPoint[];
};

type StoredGpsTrack = {
  version: number;
  startedAt: string;
  track: GpsTrackPoint[];
};

export function appendGpsTrackPoint(assignmentId: string, position: GeolocationPosition, reset = false) {
  const point = toTrackPoint(position);
  const existing = reset ? createTrack(point) : readStoredTrack(assignmentId) ?? createTrack(point);
  const previous = existing.track.at(-1);
  const shouldAppend = !previous || calculateDistanceMiles(previous, point) >= minPointDistanceMiles;
  const nextTrack = shouldAppend ? [...existing.track, point].slice(-maxTrackPoints) : existing.track;
  const next: StoredGpsTrack = {
    version: trackVersion,
    startedAt: existing.startedAt,
    track: nextTrack,
  };

  window.localStorage.setItem(getTrackStorageKey(assignmentId), JSON.stringify(next));
  return toSnapshot(next);
}

export function getGpsTrackSnapshot(assignmentId: string): GpsTrackSnapshot {
  const stored = readStoredTrack(assignmentId);

  if (!stored) {
    return {
      distanceMiles: 0,
      lastPoint: null,
      pointCount: 0,
      startedAt: null,
      track: [],
    };
  }

  return toSnapshot(stored);
}

export function readGpsTrackPayload(assignmentId: string) {
  return JSON.stringify(getGpsTrackSnapshot(assignmentId).track);
}

export function clearGpsTrack(assignmentId: string) {
  window.localStorage.removeItem(getTrackStorageKey(assignmentId));
}

function createTrack(point: GpsTrackPoint): StoredGpsTrack {
  return {
    version: trackVersion,
    startedAt: point.capturedAt,
    track: [point],
  };
}

function readStoredTrack(assignmentId: string): StoredGpsTrack | null {
  const value = window.localStorage.getItem(getTrackStorageKey(assignmentId));

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredGpsTrack> | GpsTrackPoint[];
    const track = Array.isArray(parsed) ? parsed : parsed.track;
    const points = Array.isArray(track)
      ? track.map(normalizeTrackPoint).filter((point): point is GpsTrackPoint => Boolean(point))
      : [];

    if (points.length === 0) {
      return null;
    }

    return {
      version: trackVersion,
      startedAt: Array.isArray(parsed) ? points[0].capturedAt : parsed.startedAt ?? points[0].capturedAt,
      track: points.slice(-maxTrackPoints),
    };
  } catch {
    return null;
  }
}

function toSnapshot(stored: StoredGpsTrack): GpsTrackSnapshot {
  return {
    distanceMiles: calculateTrackDistanceMiles(stored.track),
    lastPoint: stored.track.at(-1) ?? null,
    pointCount: stored.track.length,
    startedAt: stored.startedAt,
    track: stored.track,
  };
}

function normalizeTrackPoint(value: unknown): GpsTrackPoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const point = value as Record<string, unknown>;
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  const accuracy = Number(point.accuracy);
  const capturedAt = typeof point.capturedAt === "string" ? point.capturedAt : new Date().toISOString();

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
    capturedAt,
  };
}

function toTrackPoint(position: GeolocationPosition): GpsTrackPoint {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    capturedAt: new Date(position.timestamp).toISOString(),
  };
}

function calculateTrackDistanceMiles(points: GpsTrackPoint[]) {
  return points.reduce((total, point, index) => {
    const previous = points[index - 1];
    return previous ? total + calculateDistanceMiles(previous, point) : total;
  }, 0);
}

function calculateDistanceMiles(start: GpsTrackPoint, end: GpsTrackPoint) {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusMiles * centralAngle;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getTrackStorageKey(assignmentId: string) {
  return `cars-driver-gps-track:${assignmentId}`;
}
