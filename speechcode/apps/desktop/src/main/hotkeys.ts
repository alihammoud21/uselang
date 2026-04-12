import { globalShortcut } from "electron";

export class HotkeyManager {
  private accelerator = "";

  constructor(private readonly onTrigger: () => void) {}

  register(accelerator: string): boolean {
    if (this.accelerator) {
      globalShortcut.unregister(this.accelerator);
    }

    this.accelerator = accelerator;
    return globalShortcut.register(accelerator, this.onTrigger);
  }

  dispose(): void {
    if (this.accelerator) {
      globalShortcut.unregister(this.accelerator);
    }
  }
}
