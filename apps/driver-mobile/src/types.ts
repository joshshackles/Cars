export type ApiEnvelope<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

export type MobileSession = {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  driver: {
    id: string;
    name: string;
    status: string;
  };
};

export type DriverProfile = Omit<MobileSession, "token" | "expiresAt">;

export type ManifestAssignment = {
  id: string;
  status: string;
  mileageRecord: {
    miles: string | null;
    status: string;
    mileageSource: string | null;
    gpsDistanceMiles: string | null;
    gpsPointCount: number;
  } | null;
  tripLeg: {
    id: string;
    status: string;
    scheduledPickupAt: string;
    scheduledDropoffAt: string | null;
    pickupAddress: string | null;
    pickupCity: string | null;
    pickupState: string | null;
    pickupPostalCode: string | null;
    pickupCounty: string | null;
    dropoffAddress: string | null;
    dropoffCity: string | null;
    dropoffState: string | null;
    dropoffPostalCode: string | null;
    dropoffCounty: string | null;
    rideRequest: {
      id: string;
      purpose: string;
      specialInstructions: string | null;
      rider: {
        id: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        communicationPreference: string | null;
        mobilityNotes: string | null;
        riderNotes: string | null;
        pickupInstructions: string | null;
      };
    };
  };
};

export type ManifestResponse = {
  date: string;
  assignments: ManifestAssignment[];
};

export type LocationPayload = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  speedMetersPerSecond?: number;
  headingDegrees?: number;
  capturedAt: string;
};
