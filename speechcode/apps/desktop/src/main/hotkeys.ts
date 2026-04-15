import { globalShortcut } from "electron";

export class HotkeyManager {
  private currentShortcut: string | null = null;
  private readonly callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
  }

  register(shortcut: string): void {
    if (this.currentShortcut) {
      globalShortcut.unregister(this.currentShortcut);
    }
    const registered = globalShortcut.register(shortcut, this.callback);
    if (registered) {
      this.currentShortcut = shortcut;
    } else {
      // Fallback to default if custom shortcut is taken
      const fallback = "CommandOrControl+Shift+Space";
      globalShortcut.register(fallback, this.callback);
      this.currentShortcut = fallback;
    }
  }

  dispose(): void {
    globalShortcut.unregisterAll();
  }
}
