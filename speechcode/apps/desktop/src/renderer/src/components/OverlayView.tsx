import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "@speechcode/shared";
import type { AppSettings, DashboardSession, PreparedPrompt } from "@speechcode/types";
import { useSpeechCapture } from "../hooks/use-speech-capture";
import { SuggestionStrip } from "./SuggestionStrip";

export function OverlayView() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestSession, setLatestSession] = useState<DashboardSession | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<PreparedPrompt | null>(null);
  const [selectedEnhancements, setSelectedEnhancements] = useState<string[]>([]);

  const closeOverlay = useCallback(() => {
    void window.speechcode.hideOverlay();
  }, []);

  const handleSessionStart = useCallback(async (rawInput: string, enhancements: string[] = []) => {
    setErrorMessage(null);
    const result = await window.speechcode.startSession({
      rawInput,
      mode: settings.mode,
      enhancements
    });
    const failure = result.adapterResults.find((entry) => !entry.ok);

    setLatestSession(result.session);

    if (failure) {
      setErrorMessage(failure.message);
      return undefined;
    }

    return result.session;
  }, [settings.mode]);

  const capture = useSpeechCapture(settings.language, async (rawInput) => {
    capture.setProcessing();
    const prepared = await window.speechcode.preparePrompt(rawInput, settings.mode);
    if (prepared.suggestions.length > 0) {
      setPendingPrompt(prepared);
      setSelectedEnhancements(prepared.suggestions.map((suggestion) => suggestion.label));
      capture.reset();
      return;
    }

    const nextSession = await handleSessionStart(rawInput);
    if (nextSession) {
      capture.setReady();
      window.setTimeout(closeOverlay, 800);
    }
  });

  const startListening = useCallback(() => {
    capture.reset();
    setPendingPrompt(null);
    setSelectedEnhancements([]);
    setErrorMessage(null);
    window.setTimeout(() => {
      capture.startListening();
    }, 80);
  }, [capture.reset, capture.startListening]);

  useEffect(() => {
    void window.speechcode.getSettings().then((nextSettings) => {
      setSettings(nextSettings);
    });
    return window.speechcode.onOverlayActivated(() => {
      void window.speechcode.getSettings().then((nextSettings) => {
        setSettings(nextSettings);
      });
      startListening();
    });
  }, [startListening]);

  async function handleSuggestionContinue(useEnhancements: boolean): Promise<void> {
    if (!pendingPrompt) {
      return;
    }

    capture.setProcessing();
    const nextSession = await handleSessionStart(
      pendingPrompt.rawInput,
      useEnhancements ? selectedEnhancements : []
    );
    if (nextSession) {
      capture.setReady();
      setPendingPrompt(null);
      setSelectedEnhancements([]);
      window.setTimeout(closeOverlay, 800);
    }
  }

  return (
    <main className="overlay-shell">
      <section className="overlay-card voice-overlay">
        <div className="overlay-headline">
          <div>
            <p className="section-label overlay-label">SpeechCode</p>
            <h1>Click or press {settings.hotkey} to start dictating</h1>
          </div>
          <span className={`overlay-status-chip ${capture.state}`}>
            {capture.state === "listening"
              ? "Listening"
              : capture.state === "processing"
                ? "Processing"
                : capture.state === "ready"
                  ? "Sending"
                  : "Ready"}
          </span>
        </div>
        <p className="overlay-note">
          Speak naturally. SpeechCode cleans the request, opens your coding tool, and pastes it for you.
        </p>

        <button
          className={`voice-surface overlay ${capture.state}`}
          onClick={() => {
            if (capture.state === "listening") {
              capture.stopListening();
              return;
            }
            capture.startListening();
          }}
        >
          <div className="voice-orb" aria-hidden="true">
            <span />
          </div>
          <div className="voice-bars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="voice-copy">
            <strong>
              {capture.state === "listening"
                ? "Listening..."
                : capture.state === "processing"
                  ? "Preparing your request..."
                  : capture.state === "ready"
                    ? "Sending to your coding tool..."
                    : "Tap or press hotkey to speak"}
            </strong>
            <small>
              {capture.transcript ||
                errorMessage ||
                capture.errorMessage ||
                `${settings.defaultTarget === "cursor" ? "Cursor" : settings.defaultTarget === "browser" ? "Your browser target" : "VS Code"} opens in the background while you talk`}
            </small>
          </div>
        </button>

        {pendingPrompt ? (
          <SuggestionStrip
            suggestions={pendingPrompt.suggestions}
            selectedEnhancements={selectedEnhancements}
            onToggle={(label) =>
              setSelectedEnhancements((current) =>
                current.includes(label)
                  ? current.filter((item) => item !== label)
                  : [...current, label]
              )
            }
            onSkip={() => {
              void handleSuggestionContinue(false);
            }}
            onApply={() => {
              void handleSuggestionContinue(true);
            }}
          />
        ) : null}

        {latestSession ? (
          <div className="session-activity overlay-activity">
            <p className="section-label">Session</p>
            <ol className="activity-list">
              {latestSession.steps.map((step) => (
                <li key={step.id}>
                  <span className={step.status === "failed" ? "activity-dot error" : "activity-dot"} />
                  <span>{step.message}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="overlay-utility-note">
            <p className="section-label">Always ready</p>
            <p>
              SpeechCode stays in your {navigator.platform.includes("Mac") ? "menu bar" : "system tray"} and opens instantly with {settings.hotkey}.
            </p>
          </div>
        )}

        <div className="overlay-actions">
          <div className="button-row">
            <button className="link-button" onClick={() => void window.speechcode.openDashboard()}>
              Open dashboard
            </button>
            <button className="secondary-button subtle" onClick={closeOverlay}>
              Close
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
