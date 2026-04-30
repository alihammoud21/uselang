import React, { useState, useEffect, useRef, useCallback } from "react";

type Screen = "home" | "speak" | "progress" | "library" | "settings";

// ─── Speech Recognition Hook ────────────────────────────────────────────────

function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setIsSupported(true);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let fin = "";
      let int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript;
        else int += e.results[i][0].transcript;
      }
      if (fin) setTranscript((p) => p + fin);
      setInterim(int);
    };
    rec.onend = () => { setIsListening(false); setInterim(""); };
    rec.onerror = () => { setIsListening(false); setInterim(""); };
    recRef.current = rec;
    return () => rec.abort();
  }, []);

  const start = useCallback(() => {
    if (!recRef.current || isListening) return;
    setTranscript("");
    setInterim("");
    setIsListening(true);
    try { recRef.current.start(); } catch { setIsListening(false); }
  }, [isListening]);

  const stop = useCallback(() => {
    if (recRef.current) recRef.current.stop();
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    if (recRef.current) recRef.current.abort();
    setIsListening(false);
    setTranscript("");
    setInterim("");
  }, []);

  return { transcript, interim, isListening, isSupported, start, stop, reset };
}

// ─── Icons (SVG) ─────────────────────────────────────────────────────────────

function IcoHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IcoMic({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IcoBarChart({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.55}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IcoDownload({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.55}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IcoSettings({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.55}>
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IcoStop() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3" /></svg>
  );
}

function IcoBack() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  );
}

// ─── Sphere ──────────────────────────────────────────────────────────────────

function Sphere({ active, size = 200 }: { active?: boolean; size?: number }) {
  return (
    <div className={`sphere${active ? " sphere-active" : ""}`} style={{ width: size, height: size }}>
      {active && (
        <>
          <span className="sphere-ring sphere-ring-1" />
          <span className="sphere-ring sphere-ring-2" />
          <span className="sphere-ring sphere-ring-3" />
        </>
      )}
      <div className="sphere-core" />
    </div>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────

function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="screen home-screen">
      <div className="topbar-row">
        <span className="topbar-stat">0%</span>
        <span className="topbar-stat topbar-lang">English</span>
        <span className="topbar-stat">10.0m left</span>
      </div>

      <div className="greeting-block">
        <p className="greeting-label">SPEECHCODE</p>
        <h1 className="greeting-title">Hello, <em>there</em></h1>
        <p className="greeting-sub">What do you want to do today?</p>
      </div>

      <div className="home-cards-row">
        <button className="home-card" onClick={() => onNavigate("speak")}>
          <p className="home-card-eyebrow">CONTINUE</p>
          <p className="home-card-title">Free practice</p>
          <p className="home-card-sub">Open the phrase studio</p>
        </button>
        <div className="home-card">
          <p className="home-card-eyebrow">TODAY</p>
          <p className="home-card-title">One sharp phrase for today: Describe a dinner plan.</p>
          <p className="home-card-sub">1 quick lines</p>
        </div>
      </div>

      <div className="home-sphere-section" onClick={() => onNavigate("speak")}>
        <Sphere size={180} />
        <p className="sphere-label-main">Start speaking</p>
        <p className="sphere-label-sub">Open the speaking coach, then type or talk.</p>
      </div>

      <div className="home-actions-row">
        <button className="home-action" onClick={() => onNavigate("speak")}>
          <span className="home-action-icon">
            <IcoMic size={18} />
          </span>
          <span className="home-action-title">Free practice</span>
          <span className="home-action-sub">Type or say any phrase</span>
        </button>
        <button className="home-action" onClick={() => onNavigate("library")}>
          <span className="home-action-icon ico-download">
            <IcoDownload active={false} />
          </span>
          <span className="home-action-title">Saved phrases</span>
          <span className="home-action-sub">Replay offline</span>
        </button>
      </div>

      <div className="stats-row">
        <span>🔥 0 day streak</span>
        <span>✦ 0 XP</span>
        <span>🏅 Level 1</span>
      </div>
    </div>
  );
}

// ─── Speak Screen ────────────────────────────────────────────────────────────

function SpeakScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { transcript, interim, isListening, isSupported, start, stop, reset } = useSpeechRecognition();
  const [phase, setPhase] = useState<"idle" | "listening" | "done">("idle");

  const toggle = () => {
    if (phase === "idle") { setPhase("listening"); start(); }
    else if (phase === "listening") { stop(); setPhase(transcript || interim ? "done" : "idle"); }
    else { reset(); setPhase("idle"); }
  };

  const handleReset = () => { reset(); setPhase("idle"); };
  const displayed = transcript + (interim ? (transcript ? " " : "") + interim : "");

  return (
    <div className="screen speak-screen">
      <div className="speak-topbar">
        <button className="back-btn" onClick={() => { handleReset(); onNavigate("home"); }}>
          <IcoBack />
        </button>
        <span className="speak-topbar-title">Speak</span>
        {phase !== "idle" ? (
          <button className="reset-link" onClick={handleReset}>Reset</button>
        ) : <span style={{ width: 44 }} />}
      </div>

      <div className="speak-sphere-area">
        <button className="sphere-tap-btn" onClick={toggle}>
          <Sphere active={isListening} size={200} />
        </button>
        <p className="speak-status">
          {phase === "idle" && "Tap the sphere to speak"}
          {phase === "listening" && "Listening…"}
          {phase === "done" && "Tap to speak again"}
        </p>
      </div>

      {displayed && (
        <div className="transcript-card">
          <p className="transcript-text">{displayed}{interim && <span className="interim-dot" />}</p>
        </div>
      )}

      {!isSupported && (
        <p className="warn-text">Speech recognition isn't available in this browser. Try Chrome or Safari.</p>
      )}

      <div className="speak-bottom-area">
        <button className={`big-mic${isListening ? " big-mic-active" : ""}`} onClick={toggle}>
          {isListening ? <IcoStop /> : <IcoMic size={24} />}
        </button>
        {isListening && <p className="speak-hint">Tap to stop</p>}
      </div>
    </div>
  );
}

// ─── Progress Screen ─────────────────────────────────────────────────────────

function ProgressScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="screen sub-screen">
      <div className="speak-topbar">
        <button className="back-btn" onClick={() => onNavigate("home")}><IcoBack /></button>
        <span className="speak-topbar-title">Progress</span>
        <span style={{ width: 44 }} />
      </div>
      <div className="empty-state">
        <span className="empty-icon">📊</span>
        <p className="empty-title">No progress yet</p>
        <p className="empty-sub">Practice speaking to see your stats here.</p>
      </div>
    </div>
  );
}

// ─── Library Screen ──────────────────────────────────────────────────────────

function LibraryScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="screen sub-screen">
      <div className="speak-topbar">
        <button className="back-btn" onClick={() => onNavigate("home")}><IcoBack /></button>
        <span className="speak-topbar-title">Library</span>
        <span style={{ width: 44 }} />
      </div>
      <div className="empty-state">
        <span className="empty-icon">📚</span>
        <p className="empty-title">No saved phrases</p>
        <p className="empty-sub">Your saved phrases and sessions will appear here.</p>
      </div>
    </div>
  );
}

// ─── Settings Screen ─────────────────────────────────────────────────────────

const SETTINGS_ITEMS = ["Language", "Voice speed", "Recognition mode", "Theme", "About SpeechCode"];

function SettingsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="screen sub-screen">
      <div className="speak-topbar">
        <button className="back-btn" onClick={() => onNavigate("home")}><IcoBack /></button>
        <span className="speak-topbar-title">Settings</span>
        <span style={{ width: 44 }} />
      </div>
      <div className="settings-list">
        {SETTINGS_ITEMS.map((item) => (
          <button key={item} className="settings-row">
            <span>{item}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Bottom Nav ──────────────────────────────────────────────────────────────

function BottomNav({ screen, onNavigate }: { screen: Screen; onNavigate: (s: Screen) => void }) {
  return (
    <nav className="bottom-nav">
      <button className={`nav-btn${screen === "home" ? " nav-active" : ""}`} onClick={() => onNavigate("home")}>
        <IcoHome active={screen === "home"} /><span>Home</span>
      </button>
      <button className={`nav-btn${screen === "speak" ? " nav-active" : ""}`} onClick={() => onNavigate("speak")}>
        <IcoMic size={22} /><span>Speak</span>
      </button>
      <button className={`nav-btn${screen === "progress" ? " nav-active" : ""}`} onClick={() => onNavigate("progress")}>
        <IcoBarChart active={screen === "progress"} /><span>Progress</span>
      </button>
      <button className={`nav-btn${screen === "library" ? " nav-active" : ""}`} onClick={() => onNavigate("library")}>
        <IcoDownload active={screen === "library"} /><span>Library</span>
      </button>
      <button className={`nav-btn${screen === "settings" ? " nav-active" : ""}`} onClick={() => onNavigate("settings")}>
        <IcoSettings active={screen === "settings"} /><span>Settings</span>
      </button>
    </nav>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const navigate = useCallback((s: Screen) => setScreen(s), []);

  return (
    <div className="app-shell">
      <div className="app-content">
        {screen === "home" && <HomeScreen onNavigate={navigate} />}
        {screen === "speak" && <SpeakScreen onNavigate={navigate} />}
        {screen === "progress" && <ProgressScreen onNavigate={navigate} />}
        {screen === "library" && <LibraryScreen onNavigate={navigate} />}
        {screen === "settings" && <SettingsScreen onNavigate={navigate} />}
      </div>
      <BottomNav screen={screen} onNavigate={navigate} />
    </div>
  );
}
