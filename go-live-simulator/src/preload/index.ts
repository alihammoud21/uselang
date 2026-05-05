import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("goLive", {
  toggleFullscreen: () => ipcRenderer.invoke("app:toggle-fullscreen") as Promise<boolean>,
  quit: () => ipcRenderer.invoke("app:quit") as Promise<void>
});
