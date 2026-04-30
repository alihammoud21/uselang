// ── useGemmaDownload ────────────────────────────────────────────────────────
// React hook that exposes the Gemma model download state + actions.
// Wires into the engine's subscribeGemmaState for live progress updates.

import { useCallback, useEffect, useState } from "react";
import {
  subscribeGemmaState,
  getGemmaState,
  loadGemmaModel,
  downloadAndLoadModel,
  type GemmaEngineState,
} from "@/lib/gemma-engine";

export interface GemmaDownloadState {
  /** True when the real model is loaded (not stub). */
  modelReady: boolean;
  /** True when using local stub (deterministic offline fallback). */
  usingStub: boolean;
  /** True while download/load is in progress. */
  loading: boolean;
  /** 0–1 download progress. */
  progress: number;
  /** Current availability string. */
  availability: GemmaEngineState["availability"];
  /** Human-readable diagnostic. */
  diagnostic: string;
  /** Error message if last load failed. */
  error: string | null;
  /** True when model can be downloaded (native module is present). */
  canDownload: boolean;
}

export function useGemmaDownload() {
  const [state, setState] = useState<GemmaDownloadState>(toDownloadState(getGemmaState()));

  useEffect(() => {
    return subscribeGemmaState((s) => setState(toDownloadState(s)));
  }, []);

  const triggerDownload = useCallback(async () => {
    return await downloadAndLoadModel();
  }, []);

  const triggerLoad = useCallback(async () => {
    return await loadGemmaModel();
  }, []);

  return { ...state, triggerDownload, triggerLoad };
}

function toDownloadState(s: GemmaEngineState): GemmaDownloadState {
  return {
    modelReady: s.loaded && s.availability === "ready",
    usingStub: s.usingStub,
    loading: s.loading,
    progress: s.downloadProgress,
    availability: s.availability,
    diagnostic: s.diagnostic,
    error: s.error,
    canDownload:
      s.availability !== "needs-native-build" &&
      s.availability !== "ready",
  };
}
