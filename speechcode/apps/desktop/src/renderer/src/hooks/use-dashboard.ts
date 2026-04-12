import { useEffect, useState } from "react";
import type { AppSettings, DashboardData } from "@speechcode/types";
import { getSpeechCodeBridge } from "../lib/speechcode-bridge";

export function useDashboardState() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [bridgeReady, setBridgeReady] = useState(false);

  useEffect(() => {
    const bridge = getSpeechCodeBridge();

    if (!bridge) {
      setBridgeReady(false);
      return undefined;
    }

    setBridgeReady(true);

    void Promise.all([bridge.getDashboard(), bridge.getSettings()]).then(
      ([nextDashboard, nextSettings]) => {
        setDashboard(nextDashboard);
        setSettings(nextSettings);
      }
    );

    return bridge.onDashboardChanged((nextDashboard) => {
      setDashboard(nextDashboard);
    });
  }, []);

  return {
    bridgeReady,
    dashboard,
    settings,
    setSettings
  };
}
