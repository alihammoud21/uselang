import { BrowserWindow, clipboard, ipcMain, nativeImage } from "electron";
import type { SpeechCodeController } from "./app-controller";
import type { WindowManager } from "./window-manager";

let clipboardWatchInterval: ReturnType<typeof setInterval> | null = null;
let lastClipboardText = "";

export function registerIpc(
  controller: SpeechCodeController,
  windows: WindowManager
): void {
  // ── Settings ────────────────────────────────────────────────────────────
  ipcMain.handle("settings:get", async () => controller.getSettings());
  ipcMain.handle("settings:save", async (_e, settings) =>
    controller.saveSettings(settings)
  );

  // ── Dashboard ────────────────────────────────────────────────────────────
  ipcMain.handle("dashboard:get", async () => controller.getDashboard());

  // ── Session / phrase ─────────────────────────────────────────────────────
  ipcMain.handle("session:start", async (_e, input) =>
    controller.startSession(input)
  );
  ipcMain.handle("prompt:prepare", async (_e, rawInput, mode) =>
    controller.preparePrompt(rawInput, mode)
  );

  // ── Launcher ─────────────────────────────────────────────────────────────
  ipcMain.on("launcher:hide", () => windows.hideLauncher());
  ipcMain.on("launcher:expand", () => windows.expandLauncher());
  ipcMain.on("launcher:collapse", () => windows.collapseLauncher());
  ipcMain.on("launcher:open-main", () => {
    windows.hideLauncher();
    windows.showMainWindow();
  });

  // ── Clipboard watcher ────────────────────────────────────────────────────
  ipcMain.on("clipboard:watch:start", () => {
    if (clipboardWatchInterval) return;
    clipboardWatchInterval = setInterval(() => {
      const text = clipboard.readText();
      if (text && text !== lastClipboardText && text.trim().length > 3) {
        lastClipboardText = text;
        windows.send("clipboard:changed", text);
      }
    }, 800);
  });

  ipcMain.on("clipboard:watch:stop", () => {
    if (clipboardWatchInterval) {
      clearInterval(clipboardWatchInterval);
      clipboardWatchInterval = null;
    }
  });

  ipcMain.handle("clipboard:read", () => clipboard.readText());

  // ── Screenshot / OCR ─────────────────────────────────────────────────────
  // OCR is handled by the renderer via Tesseract.js (wasm) to avoid
  // native binary issues across platforms. The main process only
  // captures the screen region and returns the image data URL.
  ipcMain.handle("screenshot:capture", async () => {
    // Returns null – renderer triggers its own screen capture via
    // desktopCapturer or the user pastes an image.
    return null;
  });

  // ── Window controls ───────────────────────────────────────────────────────
  ipcMain.on("window:minimize", (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    win?.minimize();
  });
}
