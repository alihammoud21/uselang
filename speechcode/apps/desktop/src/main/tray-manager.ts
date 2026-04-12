import { Menu, Tray, nativeImage } from "electron";

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <rect x="2" y="2" width="14" height="14" rx="5" fill="#111111"/>
      <circle cx="9" cy="9" r="3" fill="#f5f5f5"/>
    </svg>
  `;

  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}

interface TrayManagerOptions {
  onOpenOverlay: () => void;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

export class TrayManager {
  private tray: Tray | null = null;

  init(options: TrayManagerOptions): void {
    this.tray = new Tray(createTrayIcon());
    this.tray.setToolTip("SpeechCode");
    this.tray.on("click", options.onOpenOverlay);
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
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

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
