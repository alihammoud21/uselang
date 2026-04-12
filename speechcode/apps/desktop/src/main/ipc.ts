import { ipcMain } from "electron";
import type { SaveSettingsInput, SessionSubmission, SpeechMode } from "@speechcode/types";
import { SpeechCodeController } from "./app-controller";
import { WindowManager } from "./window-manager";

export function registerIpc(
  controller: SpeechCodeController,
  windows: WindowManager
): void {
  ipcMain.handle("settings:get", () => controller.getSettings());
  ipcMain.handle("settings:save", (_, input: SaveSettingsInput) =>
    controller.saveSettings(input)
  );
  ipcMain.handle("dashboard:get", () => controller.getDashboard());
  ipcMain.handle("prompt:prepare", (_, rawInput: string, mode: SpeechMode) =>
    controller.preparePrompt(rawInput, mode)
  );
  ipcMain.handle("session:start", (_, input: SessionSubmission) =>
    controller.startSession(input)
  );
  ipcMain.handle("dashboard:show", () => {
    windows.showMainWindow();
  });
  ipcMain.handle("overlay:show", () => {
    windows.showOverlay();
  });
  ipcMain.handle("overlay:hide", () => {
    windows.hideOverlay();
  });
}
