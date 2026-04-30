// ── Auth client ──────────────────────────────────────────────────────────────
// Talks to the self-hosted auth backend (netlify functions:
// /api/auth-signup, /api/auth-signin, /api/profile). Persists the JWT token
// + uid in AsyncStorage so the device stays signed in across restarts. Every
// authenticated API call should pull the token via `getAuthToken()`.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "./tutor-api";

const TOKEN_KEY = "lang:auth:token";
const UID_KEY = "lang:auth:uid";
const EMAIL_KEY = "lang:auth:email";

export interface AuthSession {
  token: string;
  uid: string;
  email: string;
}

let cachedToken: string | null = null;
let cachedUid: string | null = null;

// Public synchronous getter — used by other API clients to attach the token
// to outgoing requests without an await on every call. Reads happen via the
// `loadSession()` bootstrap at app start.
export function getAuthToken(): string | null {
  return cachedToken;
}

export function getCurrentUid(): string | null {
  return cachedUid;
}

export async function loadSession(): Promise<AuthSession | null> {
  const [token, uid, email] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(UID_KEY),
    AsyncStorage.getItem(EMAIL_KEY),
  ]);
  if (!token || !uid) return null;
  cachedToken = token;
  cachedUid = uid;
  return { token, uid, email: email || "" };
}

async function persistSession(s: AuthSession) {
  cachedToken = s.token;
  cachedUid = s.uid;
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, s.token),
    AsyncStorage.setItem(UID_KEY, s.uid),
    AsyncStorage.setItem(EMAIL_KEY, s.email || ""),
  ]);
}

export async function signOut(): Promise<void> {
  cachedToken = null;
  cachedUid = null;
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(UID_KEY),
    AsyncStorage.removeItem(EMAIL_KEY),
  ]);
}

interface SignupBody {
  email: string;
  password: string;
  profile?: Record<string, unknown>;
}

export async function signUp(body: SignupBody): Promise<AuthSession> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await safeJson(res);
  if (!res.ok) {
    const msg = payload?.error || "Sign-up failed.";
    const err: any = new Error(msg);
    err.code = payload?.code;
    err.status = res.status;
    throw err;
  }
  const session: AuthSession = {
    token: payload.token,
    uid: payload.uid,
    email: payload.email,
  };
  await persistSession(session);
  return session;
}

export async function signIn({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth-signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await safeJson(res);
  if (!res.ok) {
    throw new Error(payload?.error || "Sign-in failed.");
  }
  const session: AuthSession = {
    token: payload.token,
    uid: payload.uid,
    email: payload.email,
  };
  await persistSession(session);
  return session;
}

export async function syncProfile(profile: Record<string, unknown>): Promise<void> {
  const token = getAuthToken();
  if (!token) return; // unsigned-in callers no-op silently
  try {
    await fetch(`${getApiBaseUrl()}/api/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profile),
    });
  } catch {
    /* best-effort sync; don't block UI on connectivity */
  }
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
