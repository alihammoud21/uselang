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

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private overlayWindow: BrowserWindow | null = null;
  private quitting = false;

  createMainWindow(showOnCreate = false): BrowserWindow {
    this.mainWindow = new BrowserWindow({
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

  createOverlayWindow(): BrowserWindow {
    this.overlayWindow = new BrowserWindow({
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

  showOverlay(): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      this.createOverlayWindow();
    }

    const bounds = this.overlayWindow.getBounds();
    const display = screen.getPrimaryDisplay().workArea;
    const x = Math.round(display.x + (display.width - bounds.width) / 2);
    this.overlayWindow.setPosition(
      Math.max(32, x),
      56
    );
    this.overlayWindow.show();
    this.overlayWindow.focus();
    this.overlayWindow.webContents.send("overlay:activated");
  }

  hideOverlay(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.hide();
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

    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.webContents.send(channel, payload);
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
