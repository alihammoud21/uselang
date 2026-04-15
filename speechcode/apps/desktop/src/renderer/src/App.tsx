import React, { useEffect, useState } from "react";
import { DesktopAppShell } from "./components/DesktopAppShell";
import { PronunciationCoach } from "./components/PronunciationCoach";
import { useNetworkStatus } from "./hooks/useDesktopStore";

// Route-based page stubs — these will be replaced by the real
// lang/apps/web/src/pages/* components once the monorepo is wired.
function HomePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 24,
        padding: 40,
      }}
    >
      {/* Sphere */}
      <div
        style={{
          width: 240,
          height: 240,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 36%, #ffffff 0%, #f3efe8 45%, #e8c14a 80%, #d4a820 100%)",
          boxShadow:
            "0 0 80px rgba(212,168,32,0.25), 0 20px 60px rgba(0,0,0,0.08)",
          animation: "breathe 3s ease-in-out infinite",
          cursor: "pointer",
        }}
      />
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 80px rgba(212,168,32,0.25), 0 20px 60px rgba(0,0,0,0.08); }
          50% { transform: scale(1.03); box-shadow: 0 0 100px rgba(212,168,32,0.35), 0 24px 70px rgba(0,0,0,0.10); }
        }
      `}</style>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: 13,
            color: "#A8A29E",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Tap to speak
        </p>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        {["Free practice", "Saved phrases", "Daily challenge"].map((label) => (
          <button
            key={label}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: "1px solid #E2DAD0",
              background: "#F3EFE8",
              color: "#57534E",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SpeakPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 32,
        padding: 40,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <p style={{ fontSize: 14, color: "#A8A29E", marginBottom: 8 }}>English</p>
        <p style={{ fontSize: 18, color: "#57534E", marginBottom: 24 }}>
          I would like to order a coffee, please.
        </p>
        <p
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#1C1917",
            letterSpacing: "-0.02em",
            marginBottom: 8,
          }}
        >
          Je voudrais un café, s'il vous plaît.
        </p>
        <p
          style={{
            fontSize: 16,
            color: "#B88A0A",
            fontStyle: "italic",
            marginBottom: 40,
          }}
        >
          /ʒə vudʁɛ œ̃ kafe sil vu plɛ/
        </p>
      </div>
      {/* Mic button */}
      <button
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #E8C14A 0%, #D4A820 100%)",
          boxShadow: "0 8px 32px rgba(212,168,32,0.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0014 0" />
          <path d="M12 18v3" />
        </svg>
      </button>
      <p style={{ fontSize: 13, color: "#A8A29E" }}>Hold to speak</p>
    </div>
  );
}

type Route = "home" | "speak" | "progress" | "library" | "settings";

export default function App() {
  const [route, setRoute] = useState<Route>("home");
  const isOnline = useNetworkStatus();

  // Listen for settings:open from main process
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setRoute("settings");
    // @ts-ignore
    window.electronAPI?.onSettingsOpen?.(handler);
  }, []);

  function renderPage() {
    switch (route) {
      case "home":
        return <HomePage />;
      case "speak":
        return <SpeakPage />;
      case "progress":
        return <div style={{ padding: 40 }}><h2>Progress</h2></div>;
      case "library":
        return <div style={{ padding: 40 }}><h2>Library</h2></div>;
      case "settings":
        return <div style={{ padding: 40 }}><h2>Settings</h2></div>;
      default:
        return <HomePage />;
    }
  }

  return (
    <DesktopAppShell
      activeRoute={route}
      onNavigate={(r) => setRoute(r as Route)}
      isOffline={!isOnline}
    >
      {renderPage()}
    </DesktopAppShell>
  );
}
