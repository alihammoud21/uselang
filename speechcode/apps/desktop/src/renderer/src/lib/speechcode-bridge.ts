import type { SpeechCodeApi } from "@speechcode/types";

export function getSpeechCodeBridge(): SpeechCodeApi | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.speechcode ?? null;
}

export function requireSpeechCodeBridge(): SpeechCodeApi {
  const bridge = getSpeechCodeBridge();

  if (!bridge) {
    throw new Error("SpeechCode bridge is unavailable.");
  }

  return bridge;
}
