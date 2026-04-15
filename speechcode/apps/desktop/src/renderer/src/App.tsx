import React, { useEffect, useState } from "react";
import { DesktopAppShell } from "./components/DesktopAppShell";
import { PronunciationCoach } from "./components/PronunciationCoach";
import { useNetworkStatus, useSettings, useDashboard, useClipboardOffer } from "./hooks/useDesktopStore";

// ── Home page ─────────────────────────────────────────────────────────────────
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

// ── Speak page ────────────────────────────────────────────────────────────────
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
          Je voudrais un café, s&apos;il vous plaît.
        </p>
        <p
          style={{
            fontSize: 16,
            color: "#B88A0A",
            fontStyle: "italic",
            marginBottom: 40,
          }}
        >
          /ʒə vudʁɛ ɔ̃ kafe sil vu plɛ/
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

// ── Progress page ─────────────────────────────────────────────────────────────
function ProgressPage() {
  const { dashboard, loading } = useDashboard();
  const data = dashboard as {
    sessions?: { id: string; status: string; rawInput: string; createdAt: string }[];
    totalSessions?: number;
    completedSessions?: number;
  } | null;

  const total = data?.totalSessions ?? data?.sessions?.length ?? 0;
  const completed = data?.completedSessions ??
    data?.sessions?.filter((s) => s.status === "completed").length ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{ padding: 40 }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1C1917",
          marginBottom: 4,
          letterSpacing: "-0.02em",
        }}
      >
        Progress
      </h2>
      <p style={{ fontSize: 13, color: "#A8A29E", marginBottom: 32 }}>
        Your language learning journey
      </p>

      {loading ? (
        <p style={{ color: "#A8A29E", fontSize: 14 }}>Loading...</p>
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Total sessions", value: total },
              { label: "Completed", value: completed },
              { label: "Success rate", value: `${pct}%` },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  background: "#F3EFE8",
                  borderRadius: 12,
                  padding: "20px 24px",
                  border: "1px solid #E2DAD0",
                }}
              >
                <p style={{ fontSize: 28, fontWeight: 700, color: "#1C1917", letterSpacing: "-0.02em" }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: 12, color: "#A8A29E", marginTop: 4, fontWeight: 500 }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#57534E", fontWeight: 500 }}>Session completion</span>
              <span style={{ fontSize: 13, color: "#B88A0A", fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: "#E2DAD0", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #E8C14A, #D4A820)",
                  borderRadius: 4,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          {/* Recent sessions */}
          {data?.sessions && data.sessions.length > 0 && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#57534E", marginBottom: 12, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                Recent sessions
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.sessions.slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 16px",
                      background: "#F3EFE8",
                      borderRadius: 8,
                      border: "1px solid #E2DAD0",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: s.status === "completed" ? "#22C55E" : s.status === "failed" ? "#EF4444" : "#E8C14A",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, fontSize: 13, color: "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.rawInput}
                    </span>
                    <span style={{ fontSize: 11, color: "#A8A29E", flexShrink: 0 }}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Library page ──────────────────────────────────────────────────────────────
function LibraryPage() {
  const { dashboard } = useDashboard();
  const data = dashboard as {
    sessions?: { id: string; status: string; rawInput: string; cleanedPrompt: string }[];
  } | null;

  const saved = data?.sessions?.filter((s) => s.status === "completed") ?? [];

  return (
    <div style={{ padding: 40 }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1C1917",
          marginBottom: 4,
          letterSpacing: "-0.02em",
        }}
      >
        Library
      </h2>
      <p style={{ fontSize: 13, color: "#A8A29E", marginBottom: 32 }}>
        Saved phrases and completed sessions
      </p>

      {saved.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 40px",
            color: "#A8A29E",
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>📚</div>
          <p style={{ fontWeight: 600, marginBottom: 8, color: "#57534E" }}>No saved phrases yet</p>
          <p>Complete a session to see it here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {saved.map((s) => (
            <div
              key={s.id}
              style={{
                padding: "16px 20px",
                background: "#F3EFE8",
                borderRadius: 10,
                border: "1px solid #E2DAD0",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1917", marginBottom: 4 }}>
                {s.rawInput}
              </p>
              {s.cleanedPrompt && s.cleanedPrompt !== s.rawInput && (
                <p style={{ fontSize: 13, color: "#B88A0A", fontStyle: "italic" }}>
                  {s.cleanedPrompt}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings page ─────────────────────────────────────────────────────────────
function SettingsPage() {
  const { settings, loading, saving, error, save } = useSettings();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (loading) {
    return (
      <div style={{ padding: 40, color: "#A8A29E", fontSize: 14 }}>Loading settings...</div>
    );
  }

  if (!form) {
    return (
      <div style={{ padding: 40, color: "#A8A29E", fontSize: 14 }}>Settings unavailable in this context.</div>
    );
  }

  const field = (label: string, key: string, type: "text" | "select" = "text", options?: string[]) => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#57534E", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </label>
      {type === "select" && options ? (
        <select
          value={String(form[key] ?? "")}
          onChange={(e) => setForm((f) => ({ ...f!, [key]: e.target.value }))}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #E2DAD0",
            background: "#FAFAF9",
            fontSize: 14,
            color: "#1C1917",
            outline: "none",
          }}
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          value={String(form[key] ?? "")}
          onChange={(e) => setForm((f) => ({ ...f!, [key]: e.target.value }))}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #E2DAD0",
            background: "#FAFAF9",
            fontSize: 14,
            color: "#1C1917",
            outline: "none",
          }}
        />
      )}
    </div>
  );

  return (
    <div style={{ padding: 40, maxWidth: 560 }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1C1917",
          marginBottom: 4,
          letterSpacing: "-0.02em",
        }}
      >
        Settings
      </h2>
      <p style={{ fontSize: 13, color: "#A8A29E", marginBottom: 32 }}>Preferences</p>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#B91C1C", fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {field("Default Target", "defaultTarget", "select", ["vscode", "cursor", "browser"])}
      {field("Mode", "mode", "select", ["coding", "writing", "casual", "prompt"])}
      {field("Hotkey", "hotkey")}
      {field("Language", "language")}
      {field("Browser URL", "browserUrl")}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <input
          type="checkbox"
          id="autoSend"
          checked={Boolean(form.autoSend)}
          onChange={(e) => setForm((f) => ({ ...f!, autoSend: e.target.checked }))}
        />
        <label htmlFor="autoSend" style={{ fontSize: 14, color: "#57534E" }}>Auto-send</label>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 32 }}>
        <input
          type="checkbox"
          id="previewBeforeSend"
          checked={Boolean(form.previewBeforeSend)}
          onChange={(e) => setForm((f) => ({ ...f!, previewBeforeSend: e.target.checked }))}
        />
        <label htmlFor="previewBeforeSend" style={{ fontSize: 14, color: "#57534E" }}>Preview before send</label>
      </div>

      <button
        onClick={() => { if (form) void save(form); }}
        disabled={saving}
        style={{
          padding: "10px 24px",
          borderRadius: 8,
          border: "none",
          background: saving ? "#E2DAD0" : "linear-gradient(135deg, #E8C14A 0%, #D4A820 100%)",
          color: "#1C1917",
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}

type Route = "home" | "speak" | "progress" | "library" | "settings";

export default function App() {
  const [route, setRoute] = useState<Route>("home");
  const isOnline = useNetworkStatus();
  const { clipboardText, visible: clipboardVisible, dismiss: dismissClipboard } = useClipboardOffer();

  // Listen for settings:open from main process (tray menu / hotkey)
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.electronAPI?.onSettingsOpen?.(() => setRoute("settings"));
  }, []);

  function renderPage() {
    switch (route) {
      case "home":
        return <HomePage />;
      case "speak":
        return <SpeakPage />;
      case "progress":
        return <ProgressPage />;
      case "library":
        return <LibraryPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  }

  return (
    <>
      {/* Clipboard offer banner */}
      {clipboardVisible && clipboardText && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            maxWidth: 340,
            padding: "14px 18px",
            background: "#1C1917",
            color: "#FAF8F5",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            fontSize: 13,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 2 }}>Clipboard detected</p>
          <p
            style={{
              color: "#A8A29E",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {clipboardText.slice(0, 80)}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={dismissClipboard}
              style={{
                flex: 1,
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "#A8A29E",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                dismissClipboard();
                setRoute("speak");
              }}
              style={{
                flex: 1,
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: "linear-gradient(135deg, #E8C14A 0%, #D4A820 100%)",
                color: "#1C1917",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Practice
            </button>
          </div>
        </div>
      )}

      <DesktopAppShell
        activeRoute={route}
        onNavigate={(r) => setRoute(r as Route)}
        isOffline={!isOnline}
      >
        {renderPage()}
      </DesktopAppShell>
    </>
  );
}
