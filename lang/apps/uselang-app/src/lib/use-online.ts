import { useCallback, useEffect, useRef, useState } from "react";
import { pingApi } from "./tutor-api";
import { isOnline as pingInternet } from "./connectivity";

export type OnlineState =
  | "checking"        // first-run; don't show any banner yet
  | "online"          // internet + api reachable
  | "api-down"        // internet reachable, backend sync/STT API not
  | "offline";        // no internet (hide cloud features, enable on-device paths)

export interface OnlineStatus {
  state: OnlineState;
  isInternetReachable: boolean;
  isApiReachable: boolean;
  /** True when optional backend services are reachable. Core LLM does not use this. */
  canUseCloudTutor: boolean;
  /** Legacy alias: prefer canUseCloudTutor in new code. */
  isOnline: boolean;
  lastCheckedAt: number;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 30_000;
const FAILURE_THRESHOLD = 2; // require N consecutive failures before flipping to offline

/**
 * Connectivity hook with hysteresis.
 * Probes internet + API every 30s. Requires 2 consecutive failures before
 * flipping to "offline" so transient blips don't cause banner flicker.
 */
export function useOnlineStatus(options: { enabled?: boolean } = {}): OnlineStatus {
  const enabled = options.enabled !== false;
  const [state, setState] = useState<OnlineState>("checking");
  const [isInternetReachable, setInternet] = useState(true);
  const [isApiReachable, setApi] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState(0);

  const mounted = useRef(true);
  const internetFails = useRef(0);
  const apiFails = useRef(0);

  const check = useCallback(async () => {
    const [internet, api] = await Promise.all([pingInternet(), pingApi()]);
    if (!mounted.current) return;

    // Hysteresis: a single failure doesn't flip the banner immediately.
    if (internet) internetFails.current = 0; else internetFails.current += 1;
    if (api) apiFails.current = 0; else apiFails.current += 1;

    const internetDown = internetFails.current >= FAILURE_THRESHOLD;
    const apiDown = apiFails.current >= FAILURE_THRESHOLD;

    // Success flips immediately (no hysteresis upward — recovery feels snappy).
    const effectiveInternet = internet || !internetDown;
    const effectiveApi = api || !apiDown;

    setInternet(effectiveInternet);
    setApi(effectiveApi);
    setLastCheckedAt(Date.now());

    if (!effectiveInternet) setState("offline");
    else if (!effectiveApi) setState("api-down");
    else setState("online");
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState("online");
      setInternet(true);
      setApi(true);
      return;
    }
    mounted.current = true;
    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [check, enabled]);

  return {
    state,
    isInternetReachable,
    isApiReachable,
    canUseCloudTutor: state === "online",
    // Legacy alias. Old code used `isOnline` to mean "internet exists".
    // That's still the most intuitive read, so we expose it that way.
    isOnline: isInternetReachable,
    lastCheckedAt,
    refresh: check,
  };
}
