import * as Location from "expo-location";
import type { LocationPayload } from "./types";

export async function requestTripLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Location permission is required for automatic mileage.");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High
  });

  return toLocationPayload(position);
}

export async function watchTripLocation(onLocation: (location: LocationPayload) => void) {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Location permission is required for automatic mileage.");
  }

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 50,
      timeInterval: 20000
    },
    (position) => onLocation(toLocationPayload(position))
  );
}

export function toLocationPayload(position: Location.LocationObject): LocationPayload {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy ?? undefined,
    speedMetersPerSecond: position.coords.speed ?? undefined,
    headingDegrees: position.coords.heading ?? undefined,
    capturedAt: new Date(position.timestamp).toISOString()
  };
}
