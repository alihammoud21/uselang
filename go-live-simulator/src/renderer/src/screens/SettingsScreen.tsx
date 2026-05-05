import { Maximize, Volume2 } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import type { SaveState } from "../game/types";

export function SettingsScreen({ save, updateSave, back }: { save: SaveState; updateSave: (save: SaveState) => void; back: () => void }) {
  function updateSettings(next: Partial<SaveState["settings"]>) {
    updateSave({ ...save, settings: { ...save.settings, ...next } });
  }

  async function setCamera(enabled: boolean) {
    if (!enabled) {
      updateSettings({ cameraEnabled: false });
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach((track) => track.stop());
    updateSettings({ cameraEnabled: true, fallbackOnly: false });
  }

  async function setMic(enabled: boolean) {
    if (!enabled) {
      updateSettings({ micEnabled: false });
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    stream.getTracks().forEach((track) => track.stop());
    updateSettings({ micEnabled: true, fallbackOnly: false });
  }

  async function fullscreen() {
    const active = await window.goLive?.toggleFullscreen();
    updateSettings({ fullscreen: Boolean(active) });
  }

  return (
    <main className="center-screen">
      <Card className="settings-card" title="Settings">
        <label className="setting-row">
          <span><Volume2 size={18} /> Volume</span>
          <input type="range" min="0" max="1" step="0.01" value={save.settings.volume} onChange={(event) => updateSettings({ volume: Number(event.target.value) })} />
        </label>
        <label className="setting-row">
          <span>Camera Enabled</span>
          <input type="checkbox" checked={save.settings.cameraEnabled} onChange={(event) => void setCamera(event.target.checked)} />
        </label>
        <label className="setting-row">
          <span>Microphone Enabled</span>
          <input type="checkbox" checked={save.settings.micEnabled} onChange={(event) => void setMic(event.target.checked)} />
        </label>
        <Button icon={<Maximize size={18} />} onClick={fullscreen}>Toggle Fullscreen</Button>
        <Button variant="primary" onClick={back}>Back to Dashboard</Button>
      </Card>
    </main>
  );
}
