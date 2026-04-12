import { useEffect, useState } from "react";
import type { AppSettings, SaveSettingsInput } from "@speechcode/types";
import { getSpeechCodeBridge } from "./lib/speechcode-bridge";
import { OnboardingView } from "./components/OnboardingView";
import { BridgeUnavailableView } from "./components/BridgeUnavailableView";
import { DashboardView } from "./components/DashboardView";
import { OverlayView } from "./components/OverlayView";
import { useDashboardState } from "./hooks/use-dashboard";

function isOverlayRoute(): boolean {
  return window.location.hash.includes("/overlay");
}

export function App() {
  const { bridgeReady, dashboard, settings, setSettings } = useDashboardState();
  const [settingsRequestKey, setSettingsRequestKey] = useState(0);

  useEffect(() => {
    const bridge = getSpeechCodeBridge();

    if (!bridge) {
      return undefined;
    }

    return bridge.onSettingsRequested(() => {
      setSettingsRequestKey((current) => current + 1);
    });
  }, []);

  async function handleSave(input: SaveSettingsInput): Promise<void> {
    const bridge = getSpeechCodeBridge();
    if (!bridge) {
      return;
    }

    const nextSettings = await bridge.saveSettings(input);
    setSettings(nextSettings);
  }

  if (!bridgeReady) {
    return <BridgeUnavailableView />;
  }

  if (isOverlayRoute()) {
    return <OverlayView />;
  }

  if (!dashboard || !settings) {
    return <main className="screen loading-screen">Loading SpeechCode</main>;
  }

  if (!settings.onboardingComplete) {
    return (
      <OnboardingView
        initialSettings={settings}
        onComplete={async (input: AppSettings) => {
          await handleSave(input);
        }}
      />
    );
  }

  return (
    <DashboardView
      dashboard={dashboard}
      settings={settings}
      settingsRequestKey={settingsRequestKey}
      onSettingsSaved={async (input) => {
        await handleSave(input);
      }}
      onOpenOverlay={async () => {
        const bridge = getSpeechCodeBridge();
        if (!bridge) {
          return;
        }

        await bridge.openOverlay();
      }}
    />
  );
}
