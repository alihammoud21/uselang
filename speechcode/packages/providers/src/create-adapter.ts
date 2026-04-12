import type { AppSettings, TargetAdapter } from "@speechcode/types";
import { BrowserTargetAdapter } from "./adapters/browser";
import { CursorTargetAdapter } from "./adapters/cursor";
import { VsCodeTargetAdapter } from "./adapters/vscode";

export function createTargetAdapter(settings: AppSettings): TargetAdapter {
  if (settings.defaultTarget === "vscode") {
    return new VsCodeTargetAdapter(settings);
  }

  if (settings.defaultTarget === "cursor") {
    return new CursorTargetAdapter(settings);
  }

  return new BrowserTargetAdapter(settings);
}
