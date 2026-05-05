import { BarChart3, Clapperboard, Home, MonitorUp, RadioTower, Settings, Shield, Sparkles, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import type { ScreenId, SaveState } from "../game/types";

const navItems: { id: ScreenId; label: string; icon: ReactNode }[] = [
  { id: "start", label: "Home", icon: <Home size={15} /> },
  { id: "dashboard", label: "Dashboard", icon: <BarChart3 size={15} /> },
  { id: "live", label: "Live Stream", icon: <Clapperboard size={15} /> },
  { id: "results", label: "Results", icon: <Trophy size={15} /> },
  { id: "shop", label: "Upgrades", icon: <Sparkles size={15} /> },
  { id: "wardrobe", label: "Overlays", icon: <MonitorUp size={15} /> },
  { id: "moderators", label: "Moderators", icon: <Shield size={15} /> },
  { id: "settings", label: "Settings", icon: <Settings size={15} /> }
];

export function AppShell({
  active,
  save,
  navigate,
  children
}: {
  active: ScreenId;
  save: SaveState;
  navigate: (screen: ScreenId) => void;
  children: ReactNode;
}) {
  return (
    <div className="game-shell">
      <aside className="side-nav">
        <button className="logo-lockup" onClick={() => navigate("start")}>
          <span className="logo-box">GLS</span>
          <span>
            <strong>GO LIVE</strong>
            <small>SIMULATOR</small>
          </span>
        </button>
        <nav>
          {navItems.map((item) => (
            <button key={item.id} className={active === item.id ? "nav-active" : ""} onClick={() => navigate(item.id)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="local-card">
          <Shield size={17} />
          <div>
            <span>Game Mode</span>
            <strong>Local Only</strong>
          </div>
          <i />
        </div>
        <small className="version">v1.0.0</small>
      </aside>
      <div className="shell-content">{children}</div>
    </div>
  );
}

export function ScreenTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="screen-title">
      <span>{number}</span>
      <h1>{title}</h1>
    </div>
  );
}
