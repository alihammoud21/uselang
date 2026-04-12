import { useState } from "react";
import { DEFAULT_SETTINGS } from "@speechcode/shared";
import type { AppSettings, SaveSettingsInput, TargetKind } from "@speechcode/types";

interface OnboardingViewProps {
  initialSettings?: AppSettings | null;
  onComplete: (settings: AppSettings) => Promise<void>;
}

export function OnboardingView({
  initialSettings,
  onComplete
}: OnboardingViewProps) {
  const [form, setForm] = useState<SaveSettingsInput>({
    ...(initialSettings ?? DEFAULT_SETTINGS),
    onboardingComplete: true
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(): Promise<void> {
    setSaving(true);
    try {
      await onComplete(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="screen welcome-screen">
      <section className="welcome-hero">
        <p className="eyebrow">SpeechCode</p>
        <h1>Don’t type. Build.</h1>
        <p className="lead">
          Set your default coding tool once, keep the hotkey simple, and let SpeechCode
          handle the prompt polish in a calmer interface.
        </p>
      </section>
      <section className="welcome-form">
        <div className="section-heading">
          <p className="section-label">Setup</p>
          <h3>Choose a quiet default flow</h3>
        </div>
        <div className="target-row">
          {(["vscode", "cursor", "browser"] as TargetKind[]).map((target) => (
            <button
              key={target}
              className={form.defaultTarget === target ? "target-button active" : "target-button"}
              onClick={() =>
                setForm((current) => ({ ...current, defaultTarget: target }))
              }
            >
              {target === "vscode"
                ? "VS Code"
                : target === "browser"
                  ? "Browser"
                  : "Cursor"}
            </button>
          ))}
        </div>
        <label className="field-block">
          Preferred hotkey
          <input
            value={form.hotkey}
            onChange={(event) =>
              setForm((current) => ({ ...current, hotkey: event.target.value }))
            }
          />
        </label>
        {form.defaultTarget === "browser" ? (
          <label className="field-block">
            Browser target URL
            <input
              value={form.browserUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, browserUrl: event.target.value }))
              }
            />
          </label>
        ) : null}
        <div className="checkbox-stack">
          <label className="checkbox-row minimal">
            <input
              type="checkbox"
              checked={form.previewBeforeSend}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  previewBeforeSend: event.target.checked
                }))
              }
            />
            <span>Preview before send</span>
          </label>
          <label className="checkbox-row minimal">
            <input
              type="checkbox"
              checked={form.autoSend}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  autoSend: event.target.checked
                }))
              }
            />
            <span>Auto-send</span>
          </label>
        </div>
        <button
          className="action-button"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={saving}
        >
          {saving ? "Saving..." : "Finish setup"}
        </button>
      </section>
    </main>
  );
}
