import { Camera, Mic, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import type { SaveState } from "../game/types";

export function PrivacyScreen({ save, updateSave, goDashboard }: { save: SaveState; updateSave: (save: SaveState) => void; goDashboard: () => void }) {
  const settings = save.settings;
  const [status, setStatus] = useState("");

  function setMedia(next: Partial<SaveState["settings"]>) {
    updateSave({ ...save, settings: { ...save.settings, ...next } });
  }

  async function enableCamera() {
    try {
      setStatus("Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((track) => track.stop());
      setMedia({ cameraEnabled: true, fallbackOnly: false });
      setStatus("Camera permission enabled. It will turn on during the stream.");
    } catch {
      setMedia({ cameraEnabled: false });
      setStatus("Camera permission was blocked or unavailable.");
    }
  }

  async function enableMic() {
    try {
      setStatus("Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMedia({ micEnabled: true, fallbackOnly: false });
      setStatus("Microphone permission enabled. Audio level detection stays local.");
    } catch {
      setMedia({ micEnabled: false });
      setStatus("Microphone permission was blocked or unavailable.");
    }
  }

  return (
    <main className="center-screen">
      <Card className="privacy-card">
        <ShieldCheck size={48} />
        <h1>Local simulator privacy</h1>
        <p className="large-copy">This game uses your camera and microphone locally to simulate a livestream. Nothing is actually streamed, recorded, uploaded, or sent online.</p>
        <p>Camera and microphone stay local. You can also play with action buttons only.</p>
        <div className="privacy-actions">
          <Button variant={settings.cameraEnabled ? "primary" : "secondary"} icon={<Camera size={18} />} onClick={settings.cameraEnabled ? () => setMedia({ cameraEnabled: false }) : enableCamera}>
            {settings.cameraEnabled ? "Camera Enabled" : "Enable Camera"}
          </Button>
          <Button variant={settings.micEnabled ? "primary" : "secondary"} icon={<Mic size={18} />} onClick={settings.micEnabled ? () => setMedia({ micEnabled: false }) : enableMic}>
            {settings.micEnabled ? "Microphone Enabled" : "Enable Microphone"}
          </Button>
          <Button variant="ghost" onClick={() => setMedia({ cameraEnabled: false, micEnabled: false, fallbackOnly: true })}>
            Play Without Camera/Mic
          </Button>
        </div>
        {status ? <strong className="save-message">{status}</strong> : null}
        <Button variant="primary" className="wide-button" onClick={goDashboard}>
          Continue to Dashboard
        </Button>
      </Card>
    </main>
  );
}
