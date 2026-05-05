import { RadioTower, ShieldCheck } from "lucide-react";
import { ScreenTitle } from "../components/AppShell";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { platformList } from "../game/platforms";
import type { PlatformId, SaveState } from "../game/types";

export function StartScreen({ save, updateSave, goPrivacy }: { save: SaveState; updateSave: (save: SaveState) => void; goPrivacy: () => void }) {
  function choose(platform: PlatformId) {
    updateSave({ ...save, platform });
    goPrivacy();
  }

  return (
    <main className="start-screen">
      <ScreenTitle number="1" title="START / PLATFORM SELECT" />
      <section className="start-copy">
        <RadioTower className="welcome-icon" />
        <h2>Welcome to Go Live Simulator</h2>
        <p>Practice streaming. Build your channel. Go Live.</p>
        <strong>Choose your platform to begin</strong>
      </section>
      <section className="platform-grid platform-grid-hero">
        {platformList.map((platform) => (
          <Card key={platform.id} className="platform-card">
            <div className="platform-mode-icon" style={{ color: platform.accent }}>
              {platform.name === "Twitch" ? "▣" : platform.name === "YouTube" ? "▶" : "K"}
            </div>
            <h2>{platform.name} Mode</h2>
            <p>{platform.description}</p>
            <Button variant="primary" onClick={() => choose(platform.id)}>
              Select {platform.name}
            </Button>
          </Card>
        ))}
      </section>
      <section className="privacy-banner">
        <ShieldCheck size={48} />
        <div>
          <strong>Nothing is streamed, recorded, uploaded, or sent online</strong>
          <span>Camera and microphone stay local.</span>
          <p>Go Live Simulator runs completely on your device. Your data and content never leave your computer.</p>
        </div>
        <div className="privacy-lock">100% Local<br />Private & Safe</div>
      </section>
    </main>
  );
}
