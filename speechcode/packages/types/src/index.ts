export type TargetKind = "vscode" | "browser" | "cursor";
export type SpeechMode = "coding" | "writing" | "casual" | "prompt";
export type SessionStatus =
  | "pending"
  | "running"
  | "needs-review"
  | "completed"
  | "failed";
export type StepStatus = "pending" | "running" | "completed" | "failed";

export interface AdapterResult {
  ok: boolean;
  code:
    | "ok"
    | "unsupported-platform"
    | "launch-failed"
    | "focus-failed"
    | "insert-failed"
    | "send-failed"
    | "invalid-config";
  message: string;
  detail?: string;
}

export interface TargetAdapter {
  openTarget(): Promise<AdapterResult>;
  focusTarget(): Promise<AdapterResult>;
  insertPrompt(text: string): Promise<AdapterResult>;
  sendPrompt?(): Promise<AdapterResult>;
}

export interface PromptSuggestion {
  id: string;
  label: string;
  description: string;
}

export interface AppSettings {
  onboardingComplete: boolean;
  defaultTarget: TargetKind;
  hotkey: string;
  previewBeforeSend: boolean;
  autoSend: boolean;
  language: string;
  mode: SpeechMode;
  browserUrl: string;
}

export interface SessionRecord {
  id: string;
  rawInput: string;
  cleanedPrompt: string;
  target: TargetKind;
  mode: SpeechMode;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SessionStepRecord {
  id: string;
  sessionId: string;
  stepName: string;
  status: StepStatus;
  message: string;
  timestamp: string;
}

export interface DashboardSession extends SessionRecord {
  steps: SessionStepRecord[];
}

export interface DashboardData {
  sessions: DashboardSession[];
  selectedSessionId: string | null;
  currentStatus: string;
}

export interface PreparedPrompt {
  rawInput: string;
  cleanedPrompt: string;
  mode: SpeechMode;
  actionLabel: string;
  suggestions: PromptSuggestion[];
}

export interface SessionSubmission {
  rawInput: string;
  cleanedPrompt?: string;
  mode: SpeechMode;
  enhancements?: string[];
}

export interface SessionFlowResult {
  session: DashboardSession;
  adapterResults: AdapterResult[];
}

export interface SaveSettingsInput {
  onboardingComplete: boolean;
  defaultTarget: TargetKind;
  hotkey: string;
  previewBeforeSend: boolean;
  autoSend: boolean;
  language: string;
  mode: SpeechMode;
  browserUrl: string;
}

export interface SpeechCodeApi {
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: SaveSettingsInput): Promise<AppSettings>;
  getDashboard(): Promise<DashboardData>;
  preparePrompt(rawInput: string, mode: SpeechMode): Promise<PreparedPrompt>;
  startSession(input: SessionSubmission): Promise<SessionFlowResult>;
  hideOverlay(): Promise<void>;
  openOverlay(): Promise<void>;
  openDashboard(): Promise<void>;
  onOverlayActivated(listener: () => void): () => void;
  onSettingsRequested(listener: () => void): () => void;
  onDashboardChanged(listener: (dashboard: DashboardData) => void): () => void;
}
