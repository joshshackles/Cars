import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import type { LocationSubscription } from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { ApiClient, apiBaseUrl } from "./src/api/client";
import { requestTripLocation, watchTripLocation } from "./src/location";
import { clearSession, loadSession, saveSession } from "./src/storage/session";
import { colors, spacing } from "./src/theme";
import type { LocationPayload, ManifestAssignment, ManifestResponse, MobileSession } from "./src/types";

type ActiveTracking = {
  assignmentId: string;
  points: number;
  lastLocation: LocationPayload | null;
};

export default function App() {
  const [session, setSession] = useState<MobileSession | null>(null);
  const [manifest, setManifest] = useState<ManifestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeTracking, setActiveTracking] = useState<ActiveTracking | null>(null);
  const watcherRef = useRef<LocationSubscription | null>(null);
  const api = useMemo(() => new ApiClient(session?.token ?? null), [session?.token]);

  useEffect(() => {
    loadSession()
      .then((stored) => {
        setSession(stored);
        if (stored) {
          return new ApiClient(stored.token).getManifest().then(setManifest);
        }
        return null;
      })
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      watcherRef.current?.remove();
    };
  }, []);

  async function handleSignedIn(nextSession: MobileSession) {
    await saveSession(nextSession);
    setSession(nextSession);
    setManifest(await new ApiClient(nextSession.token).getManifest());
  }

  async function refreshManifest() {
    if (!session) {
      return;
    }

    setRefreshing(true);
    try {
      setManifest(await api.getManifest());
    } catch (error) {
      showError(error);
    } finally {
      setRefreshing(false);
    }
  }

  async function signOut() {
    try {
      await api.logout();
    } catch {
      // Local sign-out should still clear the device session.
    }

    watcherRef.current?.remove();
    watcherRef.current = null;
    setActiveTracking(null);
    await clearSession();
    setSession(null);
    setManifest(null);
  }

  async function runAction(label: string, action: () => Promise<void>) {
    setBusy(label);
    try {
      await action();
      await refreshManifest();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(null);
    }
  }

  async function startTrip(assignment: ManifestAssignment) {
    await runAction("Starting GPS", async () => {
      const location = await requestTripLocation();
      const routeUrl = buildGoogleRouteUrl(assignment);
      await api.startAssignment(assignment.id, location, routeUrl);
      watcherRef.current?.remove();
      watcherRef.current = await watchTripLocation(async (nextLocation) => {
        setActiveTracking((current) => ({
          assignmentId: assignment.id,
          points: current?.assignmentId === assignment.id ? current.points + 1 : 1,
          lastLocation: nextLocation
        }));
        try {
          await api.sendLocation(assignment.id, nextLocation);
        } catch {
          // The next ping will retry naturally; avoid interrupting the driver.
        }
      });
      setActiveTracking({ assignmentId: assignment.id, points: 1, lastLocation: location });
    });
  }

  async function completeTrip(assignment: ManifestAssignment) {
    await runAction("Completing trip", async () => {
      const location = await requestTripLocation();
      await api.completeAssignment(assignment.id, location, buildGoogleRouteUrl(assignment));
      watcherRef.current?.remove();
      watcherRef.current = null;
      setActiveTracking(null);
    });
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <LoginScreen onSignedIn={handleSignedIn} />;
  }

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>CARS Driver</Text>
          <Text style={styles.headerTitle}>{session.driver.name}</Text>
          <Text style={styles.headerSub}>{session.organization.name}</Text>
        </View>
        <Pressable style={styles.headerButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={22} color={colors.surface} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshManifest} />}
      >
        <DashboardSummary manifest={manifest} activeTracking={activeTracking} />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s rides</Text>
          <Text style={styles.sectionHint}>Pull down to refresh</Text>
        </View>

        {manifest?.assignments.length ? (
          manifest.assignments.map((assignment) => (
            <TripCard
              key={assignment.id}
              assignment={assignment}
              activeTracking={activeTracking?.assignmentId === assignment.id ? activeTracking : null}
              busy={busy}
              onAccept={() =>
                runAction("Accepting", async () => {
                  await api.acceptAssignment(assignment.id);
                })
              }
              onDecline={(reason) =>
                runAction("Declining", async () => {
                  await api.declineAssignment(assignment.id, reason);
                })
              }
              onStart={() => startTrip(assignment)}
              onArrived={() =>
                runAction("Marking arrived", async () => {
                  const location = await requestTripLocation();
                  await api.markArrived(assignment.id, location);
                })
              }
              onComplete={() => completeTrip(assignment)}
              onReportIssue={(summary, details) =>
                runAction("Reporting issue", async () => {
                  await api.reportIssue(assignment.id, summary, details);
                })
              }
            />
          ))
        ) : (
          <EmptyManifest />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoginScreen({ onSignedIn }: { onSignedIn: (session: MobileSession) => Promise<void> }) {
  const [email, setEmail] = useState("driver@esc.example");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const api = useMemo(() => new ApiClient(), []);

  async function signIn() {
    setLoading(true);
    try {
      const session = await api.login(email, accessCode, Platform.OS);
      await onSignedIn(session);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.loginShell}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.loginContent}>
        <View style={styles.logoMark}>
          <Ionicons name="car-sport" size={42} color={colors.surface} />
        </View>
        <Text style={styles.loginTitle}>CARS Driver</Text>
        <Text style={styles.loginText}>Sign in to see assigned rides, launch navigation, and record GPS mileage.</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="driver@example.org"
            style={styles.input}
          />
          <Text style={styles.label}>Access code</Text>
          <TextInput
            value={accessCode}
            onChangeText={setAccessCode}
            autoCapitalize="none"
            secureTextEntry
            placeholder="Optional while testing"
            style={styles.input}
          />
          <PrimaryButton label="Sign in" icon="log-in-outline" loading={loading} onPress={signIn} />
        </View>

        <Text style={styles.endpointText}>Connected to {apiBaseUrl}</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DashboardSummary({
  manifest,
  activeTracking
}: {
  manifest: ManifestResponse | null;
  activeTracking: ActiveTracking | null;
}) {
  const assignments = manifest?.assignments ?? [];
  const active = assignments.filter((assignment) =>
    ["EN_ROUTE", "IN_PROGRESS", "ARRIVED"].includes(assignment.tripLeg.status)
  ).length;

  return (
    <View style={styles.summaryGrid}>
      <SummaryTile label="Assigned" value={assignments.length.toString()} icon="calendar-outline" />
      <SummaryTile label="Active" value={active.toString()} icon="navigate-outline" tone="red" />
      <SummaryTile
        label="GPS pings"
        value={activeTracking?.points.toString() ?? "0"}
        icon="radio-outline"
      />
    </View>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  tone
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "red";
}) {
  return (
    <View style={styles.summaryTile}>
      <Ionicons name={icon} size={22} color={tone === "red" ? colors.red : colors.navy} />
      <Text style={[styles.summaryValue, tone === "red" && { color: colors.red }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function TripCard({
  assignment,
  activeTracking,
  busy,
  onAccept,
  onDecline,
  onStart,
  onArrived,
  onComplete,
  onReportIssue
}: {
  assignment: ManifestAssignment;
  activeTracking: ActiveTracking | null;
  busy: string | null;
  onAccept: () => void;
  onDecline: (reason: string) => void;
  onStart: () => void;
  onArrived: () => void;
  onComplete: () => void;
  onReportIssue: (summary: string, details: string) => void;
}) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const trip = assignment.tripLeg;
  const rider = trip.rideRequest.rider;
  const routeUrl = buildGoogleRouteUrl(assignment);
  const isBusy = Boolean(busy);

  return (
    <View style={styles.tripCard}>
      <View style={styles.tripTop}>
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>{formatTime(trip.scheduledPickupAt)}</Text>
        </View>
        <View style={styles.tripTitleWrap}>
          <Text style={styles.riderName}>{rider.firstName} {rider.lastName}</Text>
          <Text style={styles.tripPurpose}>{titleCase(trip.rideRequest.purpose)}</Text>
        </View>
        <StatusPill status={trip.status} />
      </View>

      <LocationBlock label="Pickup" address={formatAddress(trip.pickupAddress, trip.pickupCity, trip.pickupState, trip.pickupPostalCode)} county={trip.pickupCounty} />
      <LocationBlock label="Dropoff" address={formatAddress(trip.dropoffAddress, trip.dropoffCity, trip.dropoffState, trip.dropoffPostalCode)} county={trip.dropoffCounty} />

      <View style={styles.routePanel}>
        <View style={styles.routeCopy}>
          <Text style={styles.routeTitle}>Best route</Text>
          <Text style={styles.routeText}>Open turn-by-turn directions, then return to CARS Driver to start GPS mileage.</Text>
        </View>
        <Pressable style={styles.routeButton} onPress={() => Linking.openURL(routeUrl)}>
          <Ionicons name="navigate" size={20} color={colors.surface} />
          <Text style={styles.routeButtonText}>Route</Text>
        </Pressable>
      </View>

      {activeTracking ? (
        <View style={styles.trackingPanel}>
          <Ionicons name="radio" size={20} color={colors.success} />
          <Text style={styles.trackingText}>{activeTracking.points} GPS points captured for this trip.</Text>
        </View>
      ) : null}

      <Notes assignment={assignment} />

      <View style={styles.actions}>
        {assignment.status === "OFFERED" ? (
          <PrimaryButton label="Accept assignment" icon="checkmark-circle-outline" disabled={isBusy} onPress={onAccept} />
        ) : null}

        {assignment.status === "ACCEPTED" && ["DRIVER_CONFIRMED", "ASSIGNED"].includes(trip.status) ? (
          <PrimaryButton label="Start trip and GPS" icon="navigate-outline" disabled={isBusy} onPress={onStart} />
        ) : null}

        {assignment.status === "ACCEPTED" && ["EN_ROUTE", "IN_PROGRESS"].includes(trip.status) ? (
          <PrimaryButton label="Mark arrived" icon="location-outline" disabled={isBusy} onPress={onArrived} />
        ) : null}

        {assignment.status === "ACCEPTED" && trip.status === "ARRIVED" ? (
          <PrimaryButton label="Complete and submit mileage" icon="flag-outline" disabled={isBusy} onPress={onComplete} />
        ) : null}

        {assignment.mileageRecord ? (
          <View style={styles.mileagePanel}>
            <Text style={styles.mileageTitle}>Mileage submitted</Text>
            <Text style={styles.mileageText}>
              {assignment.mileageRecord.miles ?? "0.00"} miles from {assignment.mileageRecord.gpsPointCount} GPS points.
            </Text>
          </View>
        ) : null}

        {rider.phone ? (
          <SecondaryButton label="Call rider" icon="call-outline" onPress={() => Linking.openURL(`tel:${rider.phone}`)} />
        ) : null}
        <SecondaryButton label="Report issue" icon="alert-circle-outline" onPress={() => setIssueOpen(true)} />
        {assignment.status !== "COMPLETED" && assignment.status !== "DECLINED" ? (
          <DangerButton label="Decline" icon="close-circle-outline" onPress={() => setDeclineOpen(true)} />
        ) : null}
      </View>

      <ReasonModal
        title="Decline assignment"
        visible={declineOpen}
        primaryLabel="Decline and alert dispatch"
        placeholder="Reason dispatch should review"
        onClose={() => setDeclineOpen(false)}
        onSubmit={(reason) => {
          setDeclineOpen(false);
          onDecline(reason);
        }}
      />
      <ReasonModal
        title="Report issue"
        visible={issueOpen}
        primaryLabel="Send to dispatch"
        placeholder="Short issue summary"
        detailsPlaceholder="Optional details"
        onClose={() => setIssueOpen(false)}
        onSubmit={(summary, details) => {
          setIssueOpen(false);
          onReportIssue(summary, details);
        }}
      />
    </View>
  );
}

function LocationBlock({ label, address, county }: { label: string; address: string; county: string | null }) {
  return (
    <View style={styles.locationBlock}>
      <Text style={styles.locationLabel}>{label}</Text>
      <Text style={styles.locationAddress}>{address || "Address pending"}</Text>
      {county ? <Text style={styles.locationCounty}>{county}</Text> : null}
    </View>
  );
}

function Notes({ assignment }: { assignment: ManifestAssignment }) {
  const rider = assignment.tripLeg.rideRequest.rider;
  const notes = [
    rider.mobilityNotes ? `Mobility: ${rider.mobilityNotes}` : null,
    rider.pickupInstructions ? `Pickup: ${rider.pickupInstructions}` : null,
    assignment.tripLeg.rideRequest.specialInstructions ? `Ride: ${assignment.tripLeg.rideRequest.specialInstructions}` : null,
    rider.riderNotes ? `Approved notes: ${rider.riderNotes}` : null
  ].filter((note): note is string => Boolean(note));

  if (notes.length === 0) {
    return null;
  }

  return (
    <View style={styles.notesPanel}>
      <Text style={styles.notesTitle}>Approved rider notes</Text>
      {notes.map((note) => (
        <Text key={note} style={styles.noteText}>{note}</Text>
      ))}
    </View>
  );
}

function ReasonModal({
  title,
  visible,
  primaryLabel,
  placeholder,
  detailsPlaceholder,
  onClose,
  onSubmit
}: {
  title: string;
  visible: boolean;
  primaryLabel: string;
  placeholder: string;
  detailsPlaceholder?: string;
  onClose: () => void;
  onSubmit: (summary: string, details: string) => void;
}) {
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");

  function submit() {
    if (!summary.trim()) {
      Alert.alert("Required", "Please enter a reason.");
      return;
    }

    onSubmit(summary.trim(), details.trim());
    setSummary("");
    setDetails("");
  }

  return (
    <Modal animationType="slide" visible={visible} transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder={placeholder}
            style={[styles.input, styles.textArea]}
            multiline
          />
          {detailsPlaceholder ? (
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder={detailsPlaceholder}
              style={[styles.input, styles.textArea]}
              multiline
            />
          ) : null}
          <PrimaryButton label={primaryLabel} icon="send-outline" onPress={submit} />
          <SecondaryButton label="Cancel" icon="close-outline" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function PrimaryButton({
  label,
  icon,
  loading,
  disabled,
  onPress
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.primaryButton, disabled && styles.disabledButton]} disabled={disabled || loading} onPress={onPress}>
      {loading ? <ActivityIndicator color={colors.surface} /> : <Ionicons name={icon} size={22} color={colors.surface} />}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      <Ionicons name={icon} size={21} color={colors.navy} />
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function DangerButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable style={styles.dangerButton} onPress={onPress}>
      <Ionicons name={icon} size={21} color={colors.red} />
      <Text style={styles.dangerButtonText}>{label}</Text>
    </Pressable>
  );
}

function StatusPill({ status }: { status: string }) {
  const isAttention = status === "NEEDS_ATTENTION";

  return (
    <View style={[styles.statusPill, isAttention && styles.statusPillAlert]}>
      <Text style={[styles.statusText, isAttention && styles.statusTextAlert]}>{statusLabel(status)}</Text>
    </View>
  );
}

function EmptyManifest() {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name="calendar-clear-outline" size={44} color={colors.navy} />
      <Text style={styles.emptyTitle}>No assigned rides today</Text>
      <Text style={styles.emptyText}>Your manifest will appear here when dispatch assigns a trip.</Text>
    </View>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={colors.red} />
      <Text style={styles.loadingText}>Loading CARS Driver</Text>
    </View>
  );
}

function buildGoogleRouteUrl(assignment: ManifestAssignment) {
  const trip = assignment.tripLeg;
  const params = new URLSearchParams({
    api: "1",
    origin: formatAddress(trip.pickupAddress, trip.pickupCity, trip.pickupState, trip.pickupPostalCode),
    destination: formatAddress(trip.dropoffAddress, trip.dropoffCity, trip.dropoffState, trip.dropoffPostalCode),
    travelmode: "driving"
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function formatAddress(...parts: Array<string | null>) {
  return parts.filter(Boolean).join(", ");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function statusLabel(value: string) {
  return titleCase(value);
}

function showError(error: unknown) {
  Alert.alert("CARS Driver", error instanceof Error ? error.message : "Something went wrong.");
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.navy
  },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.page,
    paddingBottom: 18,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  kicker: {
    color: "#b9d8ff",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  headerTitle: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 2
  },
  headerSub: {
    color: "#dcecff",
    marginTop: 2
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red
  },
  body: {
    flex: 1,
    backgroundColor: colors.soft,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22
  },
  bodyContent: {
    padding: spacing.page,
    gap: 16
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10
  },
  summaryTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line
  },
  summaryValue: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 12
  },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.card,
    gap: 12
  },
  tripTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  timeBadge: {
    backgroundColor: colors.navy,
    borderRadius: 8,
    minWidth: 64,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  timeText: {
    color: colors.surface,
    fontWeight: "800"
  },
  tripTitleWrap: {
    flex: 1
  },
  riderName: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900"
  },
  tripPurpose: {
    color: colors.muted,
    marginTop: 2
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: "#eaf1f9",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusPillAlert: {
    backgroundColor: "#fee2e2"
  },
  statusText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: "800"
  },
  statusTextAlert: {
    color: colors.red
  },
  locationBlock: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12
  },
  locationLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  locationAddress: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 5,
    lineHeight: 22
  },
  locationCounty: {
    color: colors.muted,
    marginTop: 3
  },
  routePanel: {
    borderRadius: 8,
    backgroundColor: "#eef6ff",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  routeCopy: {
    flex: 1
  },
  routeTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "900"
  },
  routeText: {
    color: colors.muted,
    marginTop: 3,
    lineHeight: 19
  },
  routeButton: {
    backgroundColor: colors.red,
    borderRadius: 8,
    minHeight: 52,
    minWidth: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  routeButtonText: {
    color: colors.surface,
    fontWeight: "900"
  },
  trackingPanel: {
    borderRadius: 8,
    backgroundColor: "#e8fff8",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  trackingText: {
    color: colors.ink,
    flex: 1,
    fontWeight: "700"
  },
  notesPanel: {
    borderRadius: 8,
    backgroundColor: "#fff7ed",
    padding: 12
  },
  notesTitle: {
    color: colors.ink,
    fontWeight: "900",
    marginBottom: 5
  },
  noteText: {
    color: colors.ink,
    lineHeight: 20,
    marginTop: 3
  },
  actions: {
    gap: 10
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: colors.red,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14
  },
  disabledButton: {
    opacity: 0.55
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900"
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface
  },
  secondaryButtonText: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "800"
  },
  dangerButton: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff5f5"
  },
  dangerButtonText: {
    color: colors.red,
    fontSize: 16,
    fontWeight: "800"
  },
  mileagePanel: {
    borderWidth: 1,
    borderColor: "#b7eadf",
    backgroundColor: "#effdf9",
    borderRadius: 8,
    padding: 12
  },
  mileageTitle: {
    color: colors.success,
    fontWeight: "900"
  },
  mileageText: {
    color: colors.ink,
    marginTop: 4
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    padding: 22
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12
  },
  emptyText: {
    color: colors.muted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 6
  },
  loginShell: {
    flex: 1,
    backgroundColor: colors.navy
  },
  loginContent: {
    flex: 1,
    padding: 24,
    justifyContent: "center"
  },
  logoMark: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18
  },
  loginTitle: {
    color: colors.surface,
    fontSize: 36,
    fontWeight: "900"
  },
  loginText: {
    color: "#dcecff",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 22
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    gap: 10
  },
  label: {
    color: colors.ink,
    fontWeight: "800"
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.ink,
    backgroundColor: colors.surface,
    fontSize: 16
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  endpointText: {
    color: "#b9d8ff",
    fontSize: 12,
    textAlign: "center",
    marginTop: 16
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft
  },
  loadingText: {
    color: colors.ink,
    fontWeight: "800",
    marginTop: 12
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(6, 35, 74, 0.55)",
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    gap: 12
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900"
  }
});
