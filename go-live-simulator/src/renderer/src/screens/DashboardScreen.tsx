import { Cog, DoorOpen, RadioTower, RotateCcw, ShoppingBag, Shirt, Shield, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import { ScreenTitle } from "../components/AppShell";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { findItem } from "../game/items";
import { nextMilestone } from "../game/save";
import { platforms } from "../game/platforms";
import type { SaveState, ScreenId } from "../game/types";

export function DashboardScreen({
  save,
  navigate,
  resetSave
}: {
  save: SaveState;
  navigate: (screen: ScreenId) => void;
  resetSave: () => void;
}) {
  const platform = platforms[save.platform ?? "twitch"];
  const milestone = nextMilestone(save.subscribers);
  const overlay = findItem(save.equippedOverlay);
  const mod = findItem(save.activeModerator);

  return (
    <main className="dashboard">
      <ScreenTitle number="2" title="CREATOR DASHBOARD" />
      <section className="dashboard-hero dashboard-reference" style={{ "--platform": platform.accent } as CSSProperties}>
        <div>
          <span className="section-label">Everything is simulated and stays on your device.</span>
          <h1>Creator Dashboard</h1>
          <p>{platform.name} selected. Build hype, complete stream tasks, open packs, and upgrade your fake creator setup.</p>
        </div>
        <Button variant="primary" className="go-live-button gradient-live" icon={<RadioTower />} onClick={() => navigate(save.settings.cameraEnabled || save.settings.fallbackOnly ? "live" : "privacy")}>
          GO LIVE
          <small>Start Your Stream</small>
        </Button>
      </section>

      <section className="stats-grid">
        <StatCard label="Subscribers" value={save.subscribers.toLocaleString()} accent={platform.accent} />
        <StatCard label="To Next Milestone" value={(milestone - save.subscribers).toLocaleString()} />
        <StatCard label="Money" value={`$${save.money.toLocaleString()}`} />
        <StatCard label="Stream Credits" value={save.streamCredits.toLocaleString()} />
        <StatCard label="Total Earned" value={`$${save.totalEarned.toLocaleString()}`} />
        <StatCard label="Best Peak Viewers" value={save.bestPeakViewers.toLocaleString()} />
      </section>

      <section className="dashboard-grid">
        <Card title="Current Setup">
          <div className="setup-row">
            <span>Platform</span>
            <strong>{platform.name}</strong>
          </div>
          <div className="setup-row">
            <span>Equipped Overlay</span>
            <strong>{overlay?.name ?? "Clean Default Frame"}</strong>
          </div>
          <div className="setup-row">
            <span>Active Moderator</span>
            <strong>{mod?.name ?? "No moderator"}</strong>
          </div>
        </Card>
        <Card title="Menu">
          <div className="button-grid">
            <Button icon={<ShoppingBag size={18} />} onClick={() => navigate("shop")}>Shop</Button>
            <Button icon={<Shirt size={18} />} onClick={() => navigate("wardrobe")}>Wardrobe</Button>
            <Button icon={<Shield size={18} />} onClick={() => navigate("moderators")}>Moderators</Button>
            <Button icon={<Cog size={18} />} onClick={() => navigate("settings")}>Settings</Button>
            <Button icon={<RadioTower size={18} />} variant="primary" onClick={() => navigate("privacy")}>Enable Camera</Button>
            <Button icon={<RotateCcw size={18} />} variant="danger" onClick={resetSave}>Reset Save</Button>
            <Button icon={<DoorOpen size={18} />} onClick={() => window.goLive?.quit()}>Quit Game</Button>
          </div>
        </Card>
      </section>

      <div className="milestone-bar">
        <Zap size={18} />
        <div>
          <strong>{save.subscribers.toLocaleString()} / {milestone.toLocaleString()} subscribers</strong>
          <div className="meter-track">
            <div className="meter-fill meter-green" style={{ width: `${Math.min(100, (save.subscribers / milestone) * 100)}%` }} />
          </div>
        </div>
      </div>
    </main>
  );
}
