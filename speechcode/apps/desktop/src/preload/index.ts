import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Settings
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (s: unknown) => ipcRenderer.invoke("settings:save", s),
  onSettingsOpen: (cb: () => void) =>
    ipcRenderer.on("settings:open", cb),

  // Dashboard
  getDashboard: () => ipcRenderer.invoke("dashboard:get"),
  onDashboardChanged: (cb: (data: unknown) => void) =>
    ipcRenderer.on("dashboard:changed", (_e, data) => cb(data)),

  // Session
  startSession: (input: unknown) => ipcRenderer.invoke("session:start", input),
  preparePrompt: (raw: string, mode: string) =>
    ipcRenderer.invoke("prompt:prepare", raw, mode),

  // Launcher
  hideLauncher: () => ipcRenderer.send("launcher:hide"),
  expandLauncher: () => ipcRenderer.send("launcher:expand"),
  collapseLauncher: () => ipcRenderer.send("launcher:collapse"),
  openMain: () => ipcRenderer.send("launcher:open-main"),
  onLauncherActivated: (cb: () => void) =>
    ipcRenderer.on("launcher:activated", cb),

  // Clipboard
  startClipboardWatch: () => ipcRenderer.send("clipboard:watch:start"),
  stopClipboardWatch: () => ipcRenderer.send("clipboard:watch:stop"),
  readClipboard: () => ipcRenderer.invoke("clipboard:read"),
  onClipboardChanged: (cb: (text: string) => void) =>
    ipcRenderer.on("clipboard:changed", (_e, text) => cb(text)),

  // Window controls
  minimizeWindow: () => ipcRenderer.send("window:minimize"),

  // Platform
  platform: process.platform,
  isDesktop: true,
});
