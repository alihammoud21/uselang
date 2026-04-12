import { useEffect, useState } from "react";
import type { AppSettings, SpeechMode, TargetKind } from "@speechcode/types";

interface SettingsSheetProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => Promise<void>;
}

const MODES: SpeechMode[] = ["coding", "writing", "casual", "prompt"];
const TARGETS: TargetKind[] = ["vscode", "cursor", "browser"];

export function SettingsSheet({
  isOpen,
  settings,
  onClose,
  onSave
}: SettingsSheetProps) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings, isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-sheet-backdrop" onClick={onClose}>
      <aside
        className="settings-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-sheet-header">
          <div>
            <p className="section-label">Settings</p>
            <h2>Preferences</h2>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Close settings">
            Close
          </button>
        </div>

        <section className="settings-group">
          <label className="field-block">
            <span className="field-label">Target</span>
            <select
              value={form.defaultTarget}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultTarget: event.target.value as TargetKind
                }))
              }
            >
              {TARGETS.map((target) => (
                <option key={target} value={target}>
                  {target === "vscode"
                    ? "VS Code"
                    : target === "browser"
                      ? "Browser"
                      : "Cursor"}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="settings-group">
          <label className="field-block">
            <span className="field-label">Hotkey</span>
            Trigger shortcut
            <input
              value={form.hotkey}
              onChange={(event) =>
                setForm((current) => ({ ...current, hotkey: event.target.value }))
              }
            />
          </label>
        </section>

        <section className="settings-group">
          <label className="field-block">
            <span className="field-label">Mode</span>
            <select
              value={form.mode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  mode: event.target.value as SpeechMode
                }))
              }
            >
              {MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="settings-group">
          <label className="field-block">
            <span className="field-label">Language</span>
            Input language
            <input
              value={form.language}
              onChange={(event) =>
                setForm((current) => ({ ...current, language: event.target.value }))
              }
            />
          </label>
        </section>

        <section className="settings-group">
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
        </section>

        <div className="settings-actions">
          {form.defaultTarget === "browser" ? (
            <label className="field-block wide">
              <span className="field-label">Browser URL</span>
              <input
                value={form.browserUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, browserUrl: event.target.value }))
                }
              />
            </label>
          ) : null}
          <button className="secondary-button subtle" onClick={onClose}>
            Cancel
          </button>
          <button
            className="action-button"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </aside>
    </div>
  );
}
