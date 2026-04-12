import type { AppSettings } from "@speechcode/types";

export const DEFAULT_SETTINGS: AppSettings = {
  onboardingComplete: false,
  defaultTarget: "vscode",
  hotkey: "CommandOrControl+Shift+Space",
  previewBeforeSend: true,
  autoSend: false,
  language: "en-US",
  mode: "coding",
  browserUrl: "https://chat.openai.com/"
};

export const STEP_MESSAGES: Record<string, string> = {
  captured_request: "Captured your request",
  preparing_prompt: "Preparing prompt",
  opening_target: "Opening VS Code",
  focusing_target: "Focusing your editor",
  inserting_prompt: "Inserting your prompt",
  sending_prompt: "Sending prompt",
  flow_complete: "Build ready to continue in your coding tool"
};
