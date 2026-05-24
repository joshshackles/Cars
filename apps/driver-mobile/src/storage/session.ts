import * as SecureStore from "expo-secure-store";
import type { MobileSession } from "../types";

const sessionKey = "cars-driver-session";

export async function saveSession(session: MobileSession) {
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
}

export async function loadSession() {
  const value = await SecureStore.getItemAsync(sessionKey);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as MobileSession;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(sessionKey);
}
