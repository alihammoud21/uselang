"use strict";
const electron = require("electron");
const api = {
  getSettings: () => electron.ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => electron.ipcRenderer.invoke("settings:save", settings),
  getDashboard: () => electron.ipcRenderer.invoke("dashboard:get"),
  preparePrompt: (rawInput, mode) => electron.ipcRenderer.invoke("prompt:prepare", rawInput, mode),
  startSession: (input) => electron.ipcRenderer.invoke("session:start", input),
  hideOverlay: () => electron.ipcRenderer.invoke("overlay:hide"),
  openOverlay: () => electron.ipcRenderer.invoke("overlay:show"),
  openDashboard: () => electron.ipcRenderer.invoke("dashboard:show"),
  onOverlayActivated: (listener) => {
    const wrapped = () => listener();
    electron.ipcRenderer.on("overlay:activated", wrapped);
    return () => {
      electron.ipcRenderer.removeListener("overlay:activated", wrapped);
    };
  },
  onSettingsRequested: (listener) => {
    const wrapped = () => listener();
    electron.ipcRenderer.on("settings:open", wrapped);
    return () => {
      electron.ipcRenderer.removeListener("settings:open", wrapped);
    };
  },
  onDashboardChanged: (listener) => {
    const wrapped = (_event, dashboard) => {
      listener(dashboard);
    };
    electron.ipcRenderer.on("dashboard:changed", wrapped);
    return () => {
      electron.ipcRenderer.removeListener("dashboard:changed", wrapped);
    };
  }
};
electron.contextBridge.exposeInMainWorld("speechcode", api);
