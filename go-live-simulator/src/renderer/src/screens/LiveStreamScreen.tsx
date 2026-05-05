import { Ban, BatteryCharging, Gamepad2, HandCoins, MessageCircle, RadioTower, SmilePlus, Trophy, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/Button";
import { ScreenTitle } from "../components/AppShell";
import { ChatPanel } from "../components/ChatPanel";
import { Meter } from "../components/Meter";
import { StatCard } from "../components/StatCard";
import { WebcamFrame } from "../components/WebcamFrame";
import { findItem } from "../game/items";
import { platforms } from "../game/platforms";
import { applyAction, createLiveState, finishStream, tickStream, type StreamAction } from "../game/stream";
import type { LiveState, SaveState, StreamStats } from "../game/types";
import { useCamera } from "../media/useCamera";
import { useMicrophone } from "../media/useMicrophone";

export function LiveStreamScreen({
  save,
  updateSave,
  showResults
}: {
  save: SaveState;
  updateSave: (save: SaveState) => void;
  showResults: (results: StreamStats) => void;
}) {
  const [live, setLive] = useState<LiveState>(() => createLiveState(save));
  const liveRef = useRef(live);
  const platform = platforms[save.platform ?? "twitch"];
  const overlay = findItem(save.equippedOverlay);
  const camera = useCamera(save.settings.cameraEnabled);
  const mic = useMicrophone(save.settings.micEnabled);
  const activityScore = useMemo(() => Math.min(100, camera.motionScore * 0.65 + mic.volumeScore * 0.55), [camera.motionScore, mic.volumeScore]);

  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLive((current) => tickStream(current, save, activityScore));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activityScore, save]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === " ") {
        event.preventDefault();
        doAction("react");
      }
      if (event.key === "Enter") doAction("talk");
      if (event.key === "Escape") endStream();
      if (event.key === "F11") {
        event.preventDefault();
        void window.goLive?.toggleFullscreen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function doAction(action: StreamAction) {
    setLive((current) => applyAction(current, save, action, activityScore));
  }

  function endStream() {
    const current = liveRef.current;
    const results = finishStream(current);
    updateSave({
      ...save,
      subscribers: current.subscribers,
      money: current.money,
      totalEarned: save.totalEarned + current.moneyEarned,
      bestPeakViewers: Math.max(save.bestPeakViewers, current.peakViewers)
    });
    showResults(results);
  }

  return (
    <main className="live-screen" style={{ "--platform": platform.accent } as CSSProperties}>
      <section className="live-main">
        <div className="live-header">
          <div>
            <ScreenTitle number="3" title="LIVE STREAM SCREEN" />
            <span className="live-dot"><RadioTower size={16} /> LIVE ON {platform.name.toUpperCase()}</span>
          </div>
          <Button variant="danger" onClick={endStream}>End Stream</Button>
        </div>
        <WebcamFrame videoRef={camera.videoRef} cameraEnabled={save.settings.cameraEnabled && camera.status !== "blocked"} overlay={overlay} platform={platform} motionScore={camera.motionScore} micScore={mic.volumeScore} />
        <div className="task-card">
          <div>
            <span>Current Task</span>
            <strong>{live.currentTask.text}</strong>
          </div>
          <b>{live.taskTimeLeft}s</b>
        </div>
        <div className="action-bar">
          <Button icon={<MessageCircle size={17} />} onClick={() => doAction("talk")}>Talk to Chat</Button>
          <Button icon={<Gamepad2 size={17} />} onClick={() => doAction("game")}>Play Game</Button>
          <Button icon={<Zap size={17} />} variant="primary" onClick={() => doAction("react")}>React Loudly</Button>
          <Button icon={<Trophy size={17} />} onClick={() => doAction("challenge")}>Do Challenge</Button>
          <Button icon={<BatteryCharging size={17} />} onClick={() => doAction("energy")}>Drink Energy Drink</Button>
          <Button icon={<HandCoins size={17} />} onClick={() => doAction("thank")}>Thank Donor</Button>
          <Button icon={<Ban size={17} />} onClick={() => doAction("ban")}>Ban Troll</Button>
          <Button icon={<SmilePlus size={17} />} onClick={() => doAction("idle")}>Sit Idle</Button>
        </div>
      </section>

      <aside className="live-side">
        <div className="stats-grid compact">
          <StatCard label="Viewers" value={live.viewers.toLocaleString()} accent={platform.accent} />
          <StatCard label="Subs" value={live.subscribers.toLocaleString()} />
          <StatCard label="Money" value={`$${live.money}`} />
          <StatCard label="Peak" value={live.peakViewers.toLocaleString()} />
        </div>
        <Meter label="Hype" value={live.hype} tone="purple" />
        <Meter label="Energy" value={live.energy} tone="green" />
        <Meter label="Chat Mood" value={live.chatMood} tone="cyan" />
        <Meter label="Activity" value={activityScore} tone="red" />
        <ChatPanel messages={live.chat} />
      </aside>
    </main>
  );
}
