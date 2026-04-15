import path from "node:path";
import { fileURLToPath } from "node:url";
import { Menu, Tray, nativeImage } from "electron";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

interface TrayOptions {
  onOpenLauncher: () => void;
  onOpenMain: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

export class TrayManager {
  private tray: Tray | null = null;

  init(options: TrayOptions): void {
    // Use a template image (macOS) or fallback PNG
    const iconPath = path.join(
      currentDirectory,
      "../../../../resources/tray-icon.png"
    );
    const icon = nativeImage.createFromPath(iconPath);
    this.tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    this.tray.setToolTip("UseLang");

    const menu = Menu.buildFromTemplate([
      {
        label: "Open UseLang",
        click: options.onOpenMain,
      },
      {
        label: "Quick Phrase\u2026",
        accelerator: "CommandOrControl+Shift+Space",
        click: options.onOpenLauncher,
      },
      { type: "separator" },
      {
        label: "Settings",
        click: options.onOpenSettings,
      },
      { type: "separator" },
      {
        label: "Quit UseLang",
        click: options.onQuit,
      },
    ]);

    this.tray.setContextMenu(menu);
    this.tray.on("click", options.onOpenLauncher);
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
