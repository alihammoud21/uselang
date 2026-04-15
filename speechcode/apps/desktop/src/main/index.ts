import { app } from "electron";
import { HotkeyManager } from "./hotkeys";
import { SpeechCodeController } from "./app-controller";
import { registerIpc } from "./ipc";
import { TrayManager } from "./tray-manager";
import { WindowManager } from "./window-manager";

const controller = new SpeechCodeController();
const windows = new WindowManager();
const tray = new TrayManager();
const hotkeys = new HotkeyManager(() => {
  windows.showLauncher();
});

async function bootstrap(): Promise<void> {
  await controller.init();
  registerIpc(controller, windows);

  controller.on("dashboard:changed", (dashboard) => {
    windows.send("dashboard:changed", dashboard);
  });

  const settings = await controller.getSettings();
  hotkeys.register(settings.hotkey ?? "CommandOrControl+Shift+Space");

  controller.on("settings:changed", (nextSettings: { hotkey: string }) => {
    hotkeys.register(nextSettings.hotkey);
  });

  const shouldShowMainWindow = !settings.onboardingComplete;
  windows.createMainWindow(shouldShowMainWindow);
  windows.createLauncherWindow();

  tray.init({
    onOpenLauncher: () => windows.showLauncher(),
    onOpenMain: () => windows.showMainWindow(),
    onOpenSettings: () => windows.openSettings(),
    onQuit: () => {
      windows.markQuitting();
      app.quit();
    },
  });
}

app.whenReady().then(async () => {
  if (process.platform === "darwin") {
    app.dock.hide();
  }

  await bootstrap();

  app.on("activate", () => {
    windows.showLauncher();
  });
});

app.on("window-all-closed", () => {
  // Keep alive for tray and hotkey access.
});

app.on("will-quit", () => {
  hotkeys.dispose();
  tray.destroy();
});
