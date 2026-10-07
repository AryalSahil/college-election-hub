import { useSyncExternalStore } from "react";

/**
 * The admin session token lives only in this browser's storage; the server
 * keeps just its SHA-256 hash. Reactive so a token change (login, logout,
 * password change) updates every subscribed component immediately.
 */
const STORAGE_KEY = "pce.admin.session";

function readToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

let currentToken: string | null =
  typeof window === "undefined" ? null : readToken();

const listeners = new Set<() => void>();

export function getAdminToken(): string | null {
  return currentToken;
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable; fall through to the in-memory value.
  }
  currentToken = typeof window === "undefined" ? null : readToken();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAdminToken(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => currentToken,
    () => currentToken,
  );
}
