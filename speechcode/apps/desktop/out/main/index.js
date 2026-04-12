"use strict";
const electron = require("electron");
const node_events = require("node:events");
const providers = require("@speechcode/providers");
const shared = require("@speechcode/shared");
const session = require("@speechcode/session");
const path = require("node:path");
const node_url = require("node:url");
class HotkeyManager {
  constructor(onTrigger) {
    this.onTrigger = onTrigger;
  }
  accelerator = "";
  register(accelerator) {
    if (this.accelerator) {
      electron.globalShortcut.unregister(this.accelerator);
    }
    this.accelerator = accelerator;
    return electron.globalShortcut.register(accelerator, this.onTrigger);
  }
  dispose() {
    if (this.accelerator) {
      electron.globalShortcut.unregister(this.accelerator);
    }
  }
}
class SpeechCodeController extends node_events.EventEmitter {
  store = new session.SqliteSessionStore(electron.app.getPath("userData"));
  getTargetLabel(target) {
    if (target === "cursor") {
      return "Cursor";
    }
    if (target === "browser") {
      return "your browser target";
    }
    return "VS Code";
  }
  resolveTarget(settings) {
    if (settings.defaultTarget === "cursor") {
      return "cursor";
    }
    if (settings.defaultTarget === "browser") {
      return "browser";
    }
    return "vscode";
  }
  async init() {
    await this.store.init();
  }
  async getSettings() {
    return this.store.getSettings();
  }
  async saveSettings(settings) {
    const saved = await this.store.saveSettings(settings);
    this.emit("settings:changed", saved);
    await this.emitDashboard();
    return saved;
  }
  async getDashboard() {
    return this.store.getDashboardData();
  }
  async preparePrompt(rawInput, mode) {
    return shared.cleanPrompt(rawInput, mode);
  }
  async startSession(input) {
    const settings = await this.store.getSettings();
    const selectedTarget = this.resolveTarget(settings);
    const prepared = input.cleanedPrompt ? {
      rawInput: input.rawInput,
      cleanedPrompt: input.cleanedPrompt,
      mode: input.mode,
      actionLabel: shared.inferActionLabel(input.cleanedPrompt)
    } : shared.cleanPrompt(input.rawInput, input.mode);
    const preparedWithEnhancements = input.cleanedPrompt ? prepared : shared.cleanPrompt(input.rawInput, input.mode, input.enhancements ?? []);
    const session2 = await this.store.createSession({
      rawInput: input.rawInput,
      cleanedPrompt: preparedWithEnhancements.cleanedPrompt,
      target: selectedTarget,
      mode: input.mode,
      status: "running"
    });
    await this.store.addSessionStep({
      sessionId: session2.id,
      stepName: "captured_request",
      status: "completed"
    });
    await this.store.addSessionStep({
      sessionId: session2.id,
      stepName: "preparing_prompt",
      status: "completed"
    });
    await this.emitDashboard(session2.id);
    const adapter = providers.createTargetAdapter({
      ...settings,
      defaultTarget: selectedTarget
    });
    const adapterResults = [];
    const targetLabel = this.getTargetLabel(selectedTarget);
    const openResult = await this.runAdapterStep(
      session2.id,
      "opening_target",
      () => adapter.openTarget(),
      `Opening ${targetLabel}`
    );
    adapterResults.push(openResult);
    if (!openResult.ok) {
      await this.store.updateSessionStatus(session2.id, "failed");
      await this.emitDashboard(session2.id);
      return this.getResult(session2.id, adapterResults);
    }
    const focusResult = await this.runAdapterStep(
      session2.id,
      "focusing_target",
      () => adapter.focusTarget(),
      `Focusing ${targetLabel}`
    );
    adapterResults.push(focusResult);
    if (!focusResult.ok) {
      await this.store.updateSessionStatus(session2.id, "failed");
      await this.emitDashboard(session2.id);
      return this.getResult(session2.id, adapterResults);
    }
    const insertResult = await this.runAdapterStep(
      session2.id,
      "inserting_prompt",
      () => adapter.insertPrompt(preparedWithEnhancements.cleanedPrompt),
      preparedWithEnhancements.actionLabel
    );
    adapterResults.push(insertResult);
    if (!insertResult.ok) {
      await this.store.updateSessionStatus(session2.id, "failed");
      await this.emitDashboard(session2.id);
      return this.getResult(session2.id, adapterResults);
    }
    if (settings.autoSend && adapter.sendPrompt) {
      const sendResult = await this.runAdapterStep(
        session2.id,
        "sending_prompt",
        () => adapter.sendPrompt()
      );
      adapterResults.push(sendResult);
      if (!sendResult.ok) {
        await this.store.updateSessionStatus(session2.id, "failed");
        await this.emitDashboard(session2.id);
        return this.getResult(session2.id, adapterResults);
      }
    }
    await this.store.updateSessionStatus(session2.id, "completed");
    await this.store.addSessionStep({
      sessionId: session2.id,
      stepName: "flow_complete",
      status: "completed"
    });
    this.showNotification(
      selectedTarget === "vscode" ? "Your prompt is ready in VS Code" : selectedTarget === "cursor" ? "Your prompt is ready in Cursor" : "Prompt inserted successfully"
    );
    await this.emitDashboard(session2.id);
    return this.getResult(session2.id, adapterResults);
  }
  async getResult(sessionId, adapterResults) {
    const dashboard = await this.store.getDashboardData(sessionId);
    const session2 = dashboard.sessions.find((entry) => entry.id === sessionId);
    if (!session2) {
      throw new Error("Session could not be loaded after execution.");
    }
    return {
      session: session2,
      adapterResults
    };
  }
  async runAdapterStep(sessionId, stepName, action, runningMessage) {
    await this.store.addSessionStep({
      sessionId,
      stepName,
      status: "running",
      message: runningMessage
    });
    await this.emitDashboard(sessionId);
    const result = await action();
    await this.store.addSessionStep({
      sessionId,
      stepName,
      status: result.ok ? "completed" : "failed",
      message: result.message
    });
    if (!result.ok) {
      this.showNotification(result.message);
    }
    await this.emitDashboard(sessionId);
    return result;
  }
  async emitDashboard(selectedSessionId) {
    this.emit("dashboard:changed", await this.store.getDashboardData(selectedSessionId));
  }
  showNotification(body) {
    if (!electron.Notification.isSupported()) {
      return;
    }
    new electron.Notification({
      title: "SpeechCode",
      body
    }).show();
  }
}
function registerIpc(controller2, windows2) {
  electron.ipcMain.handle("settings:get", () => controller2.getSettings());
  electron.ipcMain.handle(
    "settings:save",
    (_, input) => controller2.saveSettings(input)
  );
  electron.ipcMain.handle("dashboard:get", () => controller2.getDashboard());
  electron.ipcMain.handle(
    "prompt:prepare",
    (_, rawInput, mode) => controller2.preparePrompt(rawInput, mode)
  );
  electron.ipcMain.handle(
    "session:start",
    (_, input) => controller2.startSession(input)
  );
  electron.ipcMain.handle("dashboard:show", () => {
    windows2.showMainWindow();
  });
  electron.ipcMain.handle("overlay:show", () => {
    windows2.showOverlay();
  });
  electron.ipcMain.handle("overlay:hide", () => {
    windows2.hideOverlay();
  });
}
function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <rect x="2" y="2" width="14" height="14" rx="5" fill="#111111"/>
      <circle cx="9" cy="9" r="3" fill="#f5f5f5"/>
    </svg>
  `;
  return electron.nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}
class TrayManager {
  tray = null;
  init(options) {
    this.tray = new electron.Tray(createTrayIcon());
    this.tray.setToolTip("SpeechCode");
    this.tray.on("click", options.onOpenOverlay);
    this.tray.setContextMenu(
      electron.Menu.buildFromTemplate([
        {
          label: "Speak now",
          click: options.onOpenOverlay
        },
        {
          label: "Open dashboard",
          click: options.onOpenDashboard
        },
        {
          label: "Open settings",
          click: options.onOpenSettings
        },
        {
          type: "separator"
        },
        {
          label: "Quit SpeechCode",
          click: options.onQuit
        }
      ])
    );
  }
  destroy() {
    this.tray?.destroy();
    this.tray = null;
  }
}
const currentDirectory = path.dirname(node_url.fileURLToPath(require("url").pathToFileURL(__filename).href));
function resolveRoute(route) {
  if (process.env.ELECTRON_RENDERER_URL) {
    return `${process.env.ELECTRON_RENDERER_URL}/#/${route}`;
  }
  return path.join(currentDirectory, "../../../../dist/renderer/index.html");
}
class WindowManager {
  mainWindow = null;
  overlayWindow = null;
  quitting = false;
  createMainWindow(showOnCreate = false) {
    this.mainWindow = new electron.BrowserWindow({
      width: 1320,
      height: 860,
      minWidth: 1100,
      minHeight: 760,
      title: "SpeechCode",
      show: showOnCreate,
      backgroundColor: "#fafafa",
      webPreferences: {
        preload: path.join(currentDirectory, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    this.mainWindow.on("close", (event) => {
      if (!this.quitting) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });
    this.loadRoute(this.mainWindow, "dashboard");
    return this.mainWindow;
  }
  createOverlayWindow() {
    this.overlayWindow = new electron.BrowserWindow({
      width: 760,
      height: 520,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      alwaysOnTop: true,
      fullscreenable: false,
      resizable: false,
      movable: true,
      skipTaskbar: true,
      hasShadow: true,
      webPreferences: {
        preload: path.join(currentDirectory, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    this.overlayWindow.setAlwaysOnTop(true, "screen-saver");
    this.overlayWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true
    });
    this.overlayWindow.on("blur", () => {
      this.overlayWindow?.hide();
    });
    this.loadRoute(this.overlayWindow, "overlay");
    return this.overlayWindow;
  }
  showOverlay() {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      this.createOverlayWindow();
    }
    const bounds = this.overlayWindow.getBounds();
    const display = electron.screen.getPrimaryDisplay().workArea;
    const x = Math.round(display.x + (display.width - bounds.width) / 2);
    this.overlayWindow.setPosition(
      Math.max(32, x),
      56
    );
    this.overlayWindow.show();
    this.overlayWindow.focus();
    this.overlayWindow.webContents.send("overlay:activated");
  }
  hideOverlay() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.hide();
    }
  }
  showMainWindow() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.createMainWindow(true);
      return;
    }
    this.mainWindow.show();
    this.mainWindow.focus();
  }
  openSettings() {
    this.showMainWindow();
    this.mainWindow?.webContents.send("settings:open");
  }
  markQuitting() {
    this.quitting = true;
  }
  send(channel, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload);
    }
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.webContents.send(channel, payload);
    }
  }
  loadRoute(window, route) {
    if (process.env.ELECTRON_RENDERER_URL) {
      void window.loadURL(resolveRoute(route));
      return;
    }
    void window.loadFile(resolveRoute(route), { hash: `/${route}` });
  }
}
const controller = new SpeechCodeController();
const windows = new WindowManager();
const tray = new TrayManager();
const hotkeys = new HotkeyManager(() => {
  windows.showOverlay();
});
async function bootstrap() {
  await controller.init();
  registerIpc(controller, windows);
  controller.on("dashboard:changed", (dashboard) => {
    windows.send("dashboard:changed", dashboard);
  });
  const settings = await controller.getSettings();
  hotkeys.register(settings.hotkey);
  controller.on("settings:changed", (nextSettings) => {
    hotkeys.register(nextSettings.hotkey);
  });
  const shouldShowMainWindow = !settings.onboardingComplete;
  windows.createMainWindow(shouldShowMainWindow);
  windows.createOverlayWindow();
  tray.init({
    onOpenOverlay: () => windows.showOverlay(),
    onOpenDashboard: () => windows.showMainWindow(),
    onOpenSettings: () => windows.openSettings(),
    onQuit: () => {
      windows.markQuitting();
      electron.app.quit();
    }
  });
}
electron.app.whenReady().then(async () => {
  if (process.platform === "darwin") {
    electron.app.dock.hide();
  }
  await bootstrap();
  electron.app.on("activate", () => {
    windows.showOverlay();
  });
});
electron.app.on("window-all-closed", () => {
});
electron.app.on("will-quit", () => {
  hotkeys.dispose();
  tray.destroy();
});
