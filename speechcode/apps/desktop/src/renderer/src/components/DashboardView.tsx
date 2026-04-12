import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppSettings, DashboardData } from "@speechcode/types";
import { AppSidebar } from "./AppSidebar";
import { ContextPanel } from "./ContextPanel";
import { SettingsSheet } from "./SettingsSheet";
import { SessionIndex } from "./SessionIndex";
import { VoiceWorkspace } from "./VoiceWorkspace";

interface DashboardViewProps {
  dashboard: DashboardData;
  settings: AppSettings;
  settingsRequestKey: number;
  onSettingsSaved: (settings: AppSettings) => Promise<void>;
  onOpenOverlay: () => Promise<void>;
}

export function DashboardView({
  dashboard,
  settings,
  settingsRequestKey,
  onSettingsSaved,
  onOpenOverlay
}: DashboardViewProps) {
  const [activeView, setActiveView] = useState<"home" | "sessions" | "history">("home");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    dashboard.selectedSessionId
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState("");

  useEffect(() => {
    setSelectedSessionId(dashboard.selectedSessionId);
  }, [dashboard.selectedSessionId]);

  useEffect(() => {
    if (settingsRequestKey > 0) {
      setIsSettingsOpen(true);
    }
  }, [settingsRequestKey]);

  const selectedSession = useMemo(
    () =>
      dashboard.sessions.find((session) => session.id === selectedSessionId) ??
      dashboard.sessions[0],
    [dashboard.sessions, selectedSessionId]
  );

  const historySessions = useMemo(
    () =>
      dashboard.sessions.filter(
        (session) => session.status === "completed" || session.status === "failed"
      ),
    [dashboard.sessions]
  );

  const visibleSessions = activeView === "history" ? historySessions : dashboard.sessions;
  const statusText = selectedSession?.steps.at(-1)?.message ?? dashboard.currentStatus;
  const handleRun = useCallback(async (rawInput: string, enhancements: string[] = []) => {
    setErrorMessage(null);
    try {
      const result = await window.speechcode.startSession({
        rawInput,
        mode: settings.mode,
        enhancements
      });
      const failure = result.adapterResults.find((entry) => !entry.ok);

      setSelectedSessionId(result.session.id);
      setPreviewText(result.session.cleanedPrompt);

      if (failure) {
        setErrorMessage(failure.message);
      }

      return result.session;
    } finally {
    }
  }, [settings.mode]);

  return (
    <main className="screen dashboard-screen">
      <div className="workspace-layout">
        <AppSidebar
          activeView={activeView}
          onChangeView={setActiveView}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <section className="main-column">
          <VoiceWorkspace
            settings={settings}
            session={selectedSession}
            onOpenOverlay={onOpenOverlay}
            onSessionStarted={handleRun}
          />
          {activeView !== "home" ? (
            <SessionIndex
              heading={activeView === "history" ? "History" : "Sessions"}
              sessions={visibleSessions}
              selectedSessionId={selectedSession?.id ?? null}
              onSelect={setSelectedSessionId}
            />
          ) : null}
        </section>
        <ContextPanel
          session={selectedSession}
          statusText={statusText}
          errorMessage={errorMessage}
          previewText={selectedSession?.cleanedPrompt ?? previewText}
        />
      </div>
      <SettingsSheet
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={onSettingsSaved}
      />
    </main>
  );
}
