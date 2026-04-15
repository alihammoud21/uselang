import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow, screen } from "electron";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

function resolveRoute(route: string): string {
  if (process.env.ELECTRON_RENDERER_URL) {
    return `${process.env.ELECTRON_RENDERER_URL}/#/${route}`;
  }
  return path.join(currentDirectory, "../../../../dist/renderer/index.html");
}

function resolveLauncher(): string {
  if (process.env.ELECTRON_RENDERER_URL) {
    return `${process.env.ELECTRON_RENDERER_URL}/launcher.html`;
  }
  return path.join(currentDirectory, "../../../../dist/renderer/launcher.html");
}

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private launcherWindow: BrowserWindow | null = null;
  private quitting = false;

  createMainWindow(showOnCreate = false): BrowserWindow {
    this.mainWindow = new BrowserWindow({
      width: 1320,
      height: 860,
      minWidth: 1100,
      minHeight: 760,
      title: "UseLang",
      show: showOnCreate,
      backgroundColor: "#FAF8F5",
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 16, y: 16 },
      webPreferences: {
        preload: path.join(currentDirectory, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.mainWindow.on("close", (event) => {
      if (!this.quitting) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    this.loadRoute(this.mainWindow, "app");
    return this.mainWindow;
  }

  createLauncherWindow(): BrowserWindow {
    const { width: sw } = screen.getPrimaryDisplay().workAreaSize;

    this.launcherWindow = new BrowserWindow({
      width: 640,
      height: 80,
      x: Math.round((sw - 640) / 2),
      y: 56,
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
      vibrancy: "under-window",
      visualEffectState: "active",
      webPreferences: {
        preload: path.join(currentDirectory, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.launcherWindow.setAlwaysOnTop(true, "screen-saver");
    this.launcherWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });

    this.launcherWindow.on("blur", () => {
      this.launcherWindow?.hide();
    });

    void this.launcherWindow.loadURL(resolveLauncher());
    return this.launcherWindow;
  }

  showLauncher(): void {
    if (!this.launcherWindow || this.launcherWindow.isDestroyed()) {
      this.createLauncherWindow();
    }
    const bounds = this.launcherWindow!.getBounds();
    const display = screen.getPrimaryDisplay().workArea;
    const x = Math.round(display.x + (display.width - bounds.width) / 2);
    this.launcherWindow!.setPosition(Math.max(32, x), 56);
    this.launcherWindow!.show();
    this.launcherWindow!.focus();
    this.launcherWindow!.webContents.send("launcher:activated");
  }

  hideLauncher(): void {
    if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
      this.launcherWindow.hide();
    }
  }

  expandLauncher(): void {
    if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
      this.launcherWindow.setSize(640, 480, true);
    }
  }

  collapseLauncher(): void {
    if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
      this.launcherWindow.setSize(640, 80, true);
    }
  }

  showMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.createMainWindow(true);
      return;
    }
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  openSettings(): void {
    this.showMainWindow();
    this.mainWindow?.webContents.send("settings:open");
  }

  markQuitting(): void {
    this.quitting = true;
  }

  send(channel: string, payload: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload);
    }
    if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
      this.launcherWindow.webContents.send(channel, payload);
    }
  }

  private loadRoute(window: BrowserWindow, route: string): void {
    if (process.env.ELECTRON_RENDERER_URL) {
      void window.loadURL(resolveRoute(route));
      return;
    }
    void window.loadFile(resolveRoute(route), { hash: `/${route}` });
  }
}
