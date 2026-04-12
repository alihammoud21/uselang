import { useDeferredValue, useEffect, useState } from "react";
import type { AppSettings, DashboardSession, PreparedPrompt } from "@speechcode/types";
import { useSpeechCapture } from "../hooks/use-speech-capture";
import { SuggestionStrip } from "./SuggestionStrip";

interface VoiceWorkspaceProps {
  settings: AppSettings;
  session?: DashboardSession;
  onOpenOverlay: () => Promise<void>;
  onSessionStarted: (
    rawInput: string,
    enhancements?: string[]
  ) => Promise<DashboardSession | undefined>;
}

function stateLabel(state: "idle" | "listening" | "processing" | "ready" | "error"): string {
  if (state === "listening") {
    return "Listening...";
  }

  if (state === "processing") {
    return "Preparing your request...";
  }

  if (state === "ready") {
    return "Sending to your coding tool...";
  }

  if (state === "error") {
    return "Voice capture needs attention";
  }

  return "Tap or press hotkey to speak";
}

export function VoiceWorkspace({
  settings,
  session,
  onOpenOverlay,
  onSessionStarted
}: VoiceWorkspaceProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<PreparedPrompt | null>(null);
  const [selectedEnhancements, setSelectedEnhancements] = useState<string[]>([]);
  const deferredSession = useDeferredValue(session);
  const capture = useSpeechCapture(settings.language, async (rawInput) => {
    capture.setProcessing();
    const prepared = await window.speechcode.preparePrompt(rawInput, settings.mode);
    if (prepared.suggestions.length > 0) {
      setPendingPrompt(prepared);
      setSelectedEnhancements(prepared.suggestions.map((suggestion) => suggestion.label));
      capture.reset();
      return;
    }

    const nextSession = await onSessionStarted(rawInput);
    if (nextSession) {
      setStatusMessage(nextSession.steps.at(-1)?.message ?? "Ready");
      capture.setReady();
    }
  });

  useEffect(() => {
    if (deferredSession?.steps.at(-1)?.message) {
      setStatusMessage(deferredSession.steps.at(-1)?.message);
    }
  }, [deferredSession]);

  async function handleSuggestionContinue(useEnhancements: boolean): Promise<void> {
    if (!pendingPrompt) {
      return;
    }

    capture.setProcessing();
    const nextSession = await onSessionStarted(
      pendingPrompt.rawInput,
      useEnhancements ? selectedEnhancements : []
    );

    if (nextSession) {
      setStatusMessage(nextSession.steps.at(-1)?.message ?? "Ready");
      capture.setReady();
    }

    setPendingPrompt(null);
    setSelectedEnhancements([]);
  }

  return (
    <section className="voice-workspace">
      <div className="voice-header">
        <p className="section-label">Background Utility</p>
        <h1>{deferredSession?.rawInput ?? "Speak and build instantly"}</h1>
        <p>
          {deferredSession
            ? deferredSession.cleanedPrompt
            : `SpeechCode stays available in the background. Press ${settings.hotkey} and start talking.`}
        </p>
      </div>

      <button
        className={`voice-surface ${capture.state}`}
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
          <strong>{stateLabel(capture.state)}</strong>
          <small>
            {capture.transcript ||
              capture.errorMessage ||
              statusMessage ||
              `Press ${settings.hotkey} to speak`}
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

      <div className="voice-actions">
        <button className="action-button" onClick={() => capture.startListening()}>
          Start speaking
        </button>
        <button className="secondary-button subtle" onClick={() => void onOpenOverlay()}>
          Open floating overlay
        </button>
      </div>

      {deferredSession ? (
        <div className="session-activity">
          <p className="section-label">Latest Session</p>
          <ol className="activity-list">
            {deferredSession.steps.map((step) => (
              <li key={step.id}>
                <span className={step.status === "failed" ? "activity-dot error" : "activity-dot"} />
                <span>{step.message}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="voice-utility-note">
          <p className="section-label">Fast path</p>
          <p>Hotkey opens the overlay instantly. No typing, no app switching, no terminal noise.</p>
        </div>
      )}
    </section>
  );
}
