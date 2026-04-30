// ── Live Activity / Dynamic Island ──────────────────────────────────────────
// Placeholder module for iOS Dynamic Island integration.
// Full implementation requires:
//   1. An iOS ActivityKit Widget Extension (Swift, Xcode project)
//   2. A native module bridge (e.g. expo-modules-api)
//   3. The widget displaying streak / session state on the Lock Screen
//
// This module provides the TypeScript API surface so the app can call into
// it once the native side is built. Until then, all calls are safe no-ops.

import { Platform } from "react-native";

export interface LiveActivityState {
  /** Current streak days */
  streak: number;
  /** Active language label */
  language: string;
  /** Session phase: idle, listening, speaking, complete */
  phase: "idle" | "listening" | "speaking" | "complete";
  /** Session elapsed seconds */
  elapsed: number;
  /** Today's XP earned */
  todayXP: number;
}

// ── Native bridge (no-op until native widget exists) ────────────────────────

let _nativeModule: {
  startActivity: (state: LiveActivityState) => Promise<string>;
  updateActivity: (id: string, state: Partial<LiveActivityState>) => Promise<void>;
  endActivity: (id: string) => Promise<void>;
} | null = null;

function getNativeModule() {
  if (Platform.OS !== "ios") return null;
  if (_nativeModule) return _nativeModule;
  try {
    // Will resolve once the native module is registered
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@/native/LiveActivityModule");
    _nativeModule = mod;
    return mod;
  } catch {
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

let _currentActivityId: string | null = null;

export async function startLiveActivity(state: LiveActivityState): Promise<void> {
  const mod = getNativeModule();
  if (!mod) {
    console.log("[live-activity] Native module not available — no-op");
    return;
  }
  try {
    _currentActivityId = await mod.startActivity(state);
    console.log("[live-activity] Started:", _currentActivityId);
  } catch (e) {
    console.warn("[live-activity] Start failed:", e);
  }
}

export async function updateLiveActivity(state: Partial<LiveActivityState>): Promise<void> {
  if (!_currentActivityId) return;
  const mod = getNativeModule();
  if (!mod) return;
  try {
    await mod.updateActivity(_currentActivityId, state);
  } catch (e) {
    console.warn("[live-activity] Update failed:", e);
  }
}

export async function endLiveActivity(): Promise<void> {
  if (!_currentActivityId) return;
  const mod = getNativeModule();
  if (!mod) return;
  try {
    await mod.endActivity(_currentActivityId);
    console.log("[live-activity] Ended:", _currentActivityId);
    _currentActivityId = null;
  } catch (e) {
    console.warn("[live-activity] End failed:", e);
  }
}

export function hasLiveActivitySupport(): boolean {
  return Platform.OS === "ios" && getNativeModule() !== null;
}
