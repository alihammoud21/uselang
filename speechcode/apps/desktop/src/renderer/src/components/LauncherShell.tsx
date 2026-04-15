import React, { useEffect, useRef, useState } from "react";

type LauncherMode = "phrase" | "speak" | "screenshot";

interface LauncherResult {
  targetPhrase: string;
  phonetics: string;
  explanation: string;
}

const MODE_LABELS: Record<LauncherMode, string> = {
  phrase: "Translate & practice",
  speak: "Speak now",
  screenshot: "Paste screenshot",
};

const MODE_PLACEHOLDERS: Record<LauncherMode, string> = {
  phrase: "Type a phrase to translate and practice...",
  speak: "Hold Space to speak...",
  screenshot: "Paste a screenshot with Cmd+V...",
};

declare global {
  interface Window {
    electronAPI?: {
      hideLauncher: () => void;
      expandLauncher: () => void;
      collapseLauncher: () => void;
      openMain: () => void;
      onLauncherActivated: (cb: () => void) => void;
      preparePrompt: (raw: string, mode: string) => Promise<unknown>;
      startSession: (input: unknown) => Promise<unknown>;
    };
  }
}

export function LauncherShell() {
  const [mode, setMode] = useState<LauncherMode>("phrase");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<LauncherResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when launcher activates
  useEffect(() => {
    window.electronAPI?.onLauncherActivated(() => {
      setInput("");
      setResult(null);
      setError(null);
      setExpanded(false);
      window.electronAPI?.collapseLauncher();
      setTimeout(() => inputRef.current?.focus(), 60);
    });
    inputRef.current?.focus();
  }, []);

  // Cycle modes with Tab
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      window.electronAPI?.hideLauncher();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const modes: LauncherMode[] = ["phrase", "speak", "screenshot"];
      const next = modes[(modes.indexOf(mode) + 1) % modes.length];
      setMode(next);
      return;
    }
    if (e.key === "Enter" && input.trim()) {
      void handleSubmit();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      window.electronAPI?.openMain();
    }
  }

  async function handleSubmit() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    if (!expanded) {
      setExpanded(true);
      window.electronAPI?.expandLauncher();
    }
    try {
      // Step 1: prepare / clean the prompt
      const prepared = (await window.electronAPI?.preparePrompt(
        input.trim(),
        mode === "speak" ? "casual" : "writing"
      )) as { cleanedPrompt: string; actionLabel: string } | undefined;

      const cleanedPrompt = prepared?.cleanedPrompt ?? input.trim();

      // Step 2: fire the session (inserts into target editor)
      const sessionResult = (await window.electronAPI?.startSession({
        rawInput: input.trim(),
        cleanedPrompt,
        mode: mode === "speak" ? "casual" : "writing",
      })) as { session: { cleanedPrompt: string } } | undefined;

      setResult({
        targetPhrase: sessionResult?.session?.cleanedPrompt ?? cleanedPrompt,
        phonetics: "[phonetics appear after AI processing]",
        explanation:
          "Phrase prepared and inserted into your target editor. Open the app for full pronunciation coaching.",
      });
    } catch (err) {
      setError((err as Error).message ?? "Something went wrong");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(135deg, rgba(250,248,245,0.92) 0%, rgba(237,232,223,0.92) 100%)",
        backdropFilter: "blur(32px) saturate(1.6)",
        WebkitBackdropFilter: "blur(32px) saturate(1.6)",
        borderRadius: 14,
        border: "1px solid rgba(201,169,122,0.22)",
        boxShadow:
          "0 32px 64px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
        overflow: "hidden",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Input row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 80,
          padding: "0 20px",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Sphere dot */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 38% 36%, #fff 0%, #f3efe8 40%, #e8c14a 100%)",
            boxShadow: "0 2px 8px rgba(212,168,32,0.35)",
            flexShrink: 0,
          }}
        />

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={MODE_PLACEHOLDERS[mode]}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 16,
            color: "#1C1917",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        />

        {/* Mode pill */}
        <button
          onClick={() => {
            const modes: LauncherMode[] = ["phrase", "speak", "screenshot"];
            setMode(modes[(modes.indexOf(mode) + 1) % modes.length]);
          }}
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            border: "1px solid rgba(201,169,122,0.4)",
            background: "rgba(232,193,74,0.12)",
            color: "#B88A0A",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {MODE_LABELS[mode]}
        </button>

        <kbd
          style={{
            padding: "3px 7px",
            borderRadius: 6,
            background: "rgba(28,25,23,0.06)",
            color: "#57534E",
            fontSize: 11,
            fontFamily: "inherit",
            border: "1px solid rgba(28,25,23,0.1)",
          }}
        >
          Tab
        </kbd>
      </div>

      {/* Result panel */}
      {expanded && (
        <div
          style={{
            flex: 1,
            padding: "0 20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            borderTop: "1px solid rgba(201,169,122,0.18)",
            paddingTop: 20,
            overflowY: "auto",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "#A8A29E",
                fontSize: 14,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid #E8C14A",
                  borderTopColor: "transparent",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Thinking...
            </div>
          ) : error ? (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.2)",
                color: "#B91C1C",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : result ? (
            <>
              <div>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#1C1917",
                    letterSpacing: "-0.02em",
                    marginBottom: 4,
                  }}
                >
                  {result.targetPhrase}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "#B88A0A",
                    fontStyle: "italic",
                    letterSpacing: "0.01em",
                  }}
                >
                  {result.phonetics}
                </p>
              </div>
              <p style={{ fontSize: 13, color: "#57534E", lineHeight: 1.6 }}>
                {result.explanation}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => window.electronAPI?.openMain()}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      "linear-gradient(135deg, #E8C14A 0%, #D4A820 100%)",
                    color: "#1C1917",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Practice
                </button>
                <button
                  onClick={() => window.electronAPI?.hideLauncher()}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid rgba(201,169,122,0.4)",
                    background: "transparent",
                    color: "#57534E",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Dismiss
                </button>
                <button
                  onClick={() => window.electronAPI?.openMain()}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid rgba(201,169,122,0.4)",
                    background: "transparent",
                    color: "#57534E",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    marginLeft: "auto",
                  }}
                >
                  Open in app
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        input::placeholder { color: #A8A29E; }
        button:hover { opacity: 0.85; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,169,122,0.3); border-radius: 2px; }
      `}</style>
    </div>
  );
}
