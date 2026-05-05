import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { clearSave, loadSave, milestones, storeSave } from "./game/save";
import type { SaveState, ScreenId, StreamStats } from "./game/types";
import { DashboardScreen } from "./screens/DashboardScreen";
import { LiveStreamScreen } from "./screens/LiveStreamScreen";
import { ModeratorsScreen } from "./screens/ModeratorsScreen";
import { PrivacyScreen } from "./screens/PrivacyScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ShopScreen } from "./screens/ShopScreen";
import { StartScreen } from "./screens/StartScreen";
import { WardrobeScreen } from "./screens/WardrobeScreen";

export function App() {
  const [save, setSave] = useState<SaveState>(() => loadSave());
  const [screen, setScreen] = useState<ScreenId>(() => (loadSave().platform ? "dashboard" : "start"));
  const [lastResults, setLastResults] = useState<StreamStats | null>(null);

  useEffect(() => {
    storeSave(save);
  }, [save]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "F11") {
        event.preventDefault();
        void window.goLive?.toggleFullscreen();
      }
      if (event.key === "Escape" && screen !== "live") setScreen("settings");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen]);

  function updateSave(next: SaveState) {
    const reached = milestones.filter((milestone) => next.subscribers >= milestone);
    setSave({ ...next, milestonesReached: Array.from(new Set([...next.milestonesReached, ...reached])) });
  }

  function resetSave() {
    const next = clearSave();
    setSave(next);
    setScreen("start");
    setLastResults(null);
  }

  function showResults(results: StreamStats) {
    setLastResults(results);
    setScreen("results");
  }

  let content;
  if (screen === "start") content = <StartScreen save={save} updateSave={updateSave} goPrivacy={() => setScreen("privacy")} />;
  else if (screen === "privacy") content = <PrivacyScreen save={save} updateSave={updateSave} goDashboard={() => setScreen("dashboard")} />;
  else if (screen === "shop") content = <ShopScreen save={save} updateSave={updateSave} back={() => setScreen("dashboard")} />;
  else if (screen === "wardrobe") content = <WardrobeScreen save={save} updateSave={updateSave} back={() => setScreen("dashboard")} />;
  else if (screen === "moderators") content = <ModeratorsScreen save={save} updateSave={updateSave} back={() => setScreen("dashboard")} />;
  else if (screen === "settings") content = <SettingsScreen save={save} updateSave={updateSave} back={() => setScreen("dashboard")} />;
  else if (screen === "live") content = <LiveStreamScreen save={save} updateSave={updateSave} showResults={showResults} />;
  else if (screen === "results") content = <ResultsScreen save={save} results={lastResults} back={() => setScreen("dashboard")} />;
  else content = <DashboardScreen save={save} navigate={setScreen} resetSave={resetSave} />;

  return (
    <AppShell active={screen} save={save} navigate={setScreen}>
      {content}
    </AppShell>
  );
}
