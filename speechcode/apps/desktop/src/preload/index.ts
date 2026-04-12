import { contextBridge, ipcRenderer } from "electron";
import type { SaveSettingsInput, SessionSubmission, SpeechCodeApi, SpeechMode } from "@speechcode/types";

const api: SpeechCodeApi = {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings: SaveSettingsInput) => ipcRenderer.invoke("settings:save", settings),
  getDashboard: () => ipcRenderer.invoke("dashboard:get"),
  preparePrompt: (rawInput: string, mode: SpeechMode) =>
    ipcRenderer.invoke("prompt:prepare", rawInput, mode),
  startSession: (input: SessionSubmission) => ipcRenderer.invoke("session:start", input),
  hideOverlay: () => ipcRenderer.invoke("overlay:hide"),
  openOverlay: () => ipcRenderer.invoke("overlay:show"),
  openDashboard: () => ipcRenderer.invoke("dashboard:show"),
  onOverlayActivated: (listener) => {
    const wrapped = () => listener();
    ipcRenderer.on("overlay:activated", wrapped);
    return () => {
      ipcRenderer.removeListener("overlay:activated", wrapped);
    };
  },
  onSettingsRequested: (listener) => {
    const wrapped = () => listener();
    ipcRenderer.on("settings:open", wrapped);
    return () => {
      ipcRenderer.removeListener("settings:open", wrapped);
    };
  },
  onDashboardChanged: (listener) => {
    const wrapped = (_event: unknown, dashboard: Parameters<typeof listener>[0]) => {
      listener(dashboard);
    };

    ipcRenderer.on("dashboard:changed", wrapped);
    return () => {
      ipcRenderer.removeListener("dashboard:changed", wrapped);
    };
  }
};

contextBridge.exposeInMainWorld("speechcode", api);
