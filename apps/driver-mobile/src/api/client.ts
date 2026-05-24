import Constants from "expo-constants";
import type { ApiEnvelope, DriverProfile, LocationPayload, ManifestResponse, MobileSession } from "../types";

const configuredBaseUrl =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? "https://carsdispatch.vercel.app";

export class ApiClient {
  private token: string | null;

  constructor(token: string | null = null) {
    this.token = token;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  login(email: string, accessCode: string, deviceName: string) {
    return this.request<MobileSession>("/api/mobile/auth/login", {
      method: "POST",
      body: { email, accessCode, deviceName }
    });
  }

  logout() {
    return this.request<{ signedOut: boolean }>("/api/mobile/auth/logout", { method: "POST" });
  }

  getProfile() {
    return this.request<DriverProfile>("/api/mobile/driver/me");
  }

  getManifest(date = new Date()) {
    const day = date.toISOString().slice(0, 10);
    return this.request<ManifestResponse>(`/api/mobile/driver/manifest?date=${day}`);
  }

  acceptAssignment(assignmentId: string) {
    return this.assignmentAction(assignmentId, "accept");
  }

  declineAssignment(assignmentId: string, reason: string) {
    return this.assignmentAction(assignmentId, "decline", { reason });
  }

  startAssignment(assignmentId: string, location: LocationPayload, routeUrl?: string) {
    return this.assignmentAction(assignmentId, "start", { location, routeUrl });
  }

  sendLocation(assignmentId: string, location: LocationPayload) {
    return this.assignmentAction(assignmentId, "location", { location });
  }

  markArrived(assignmentId: string, location?: LocationPayload) {
    return this.assignmentAction(assignmentId, "arrived", location ? { location } : {});
  }

  completeAssignment(assignmentId: string, location: LocationPayload, routeUrl?: string) {
    return this.assignmentAction(assignmentId, "complete", { location, routeUrl });
  }

  reportIssue(assignmentId: string, summary: string, details: string) {
    return this.assignmentAction(assignmentId, "report-issue", { summary, details });
  }

  private assignmentAction<T = { assignmentId: string }>(assignmentId: string, action: string, body?: unknown) {
    return this.request<T>(`/api/mobile/assignments/${assignmentId}/${action}`, {
      method: "POST",
      body
    });
  }

  private async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST";
      body?: unknown;
    } = {}
  ): Promise<T> {
    const response = await fetch(`${configuredBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = (await response.json()) as ApiEnvelope<T>;

    if (!payload.ok) {
      throw new Error(payload.error);
    }

    return payload.data;
  }
}

export const apiBaseUrl = configuredBaseUrl;
