import type { AdapterResult, AppSettings, TargetAdapter } from "@speechcode/types";
import { DesktopAutomation } from "./automation";

const WINDOWS_CURSOR_COMMANDS = [
  `"Cursor"`,
  `"$env:LOCALAPPDATA\\Programs\\cursor\\Cursor.exe"`,
  `"$env:ProgramFiles\\Cursor\\Cursor.exe"`
];

export class CursorTargetAdapter implements TargetAdapter {
  constructor(
    private readonly _settings: AppSettings,
    private readonly automation = new DesktopAutomation()
  ) {}

  async openTarget(): Promise<AdapterResult> {
    return this.automation.launchApp("Cursor", WINDOWS_CURSOR_COMMANDS);
  }

  async focusTarget(): Promise<AdapterResult> {
    const activation = await this.automation.activateApp(["Cursor"]);
    if (!activation.ok) {
      return activation;
    }

    await this.automation.delay(500);
    return this.automation.focusPrimaryEditor("Cursor editor");
  }

  async insertPrompt(text: string): Promise<AdapterResult> {
    return this.automation.pasteText(text);
  }

  async sendPrompt(): Promise<AdapterResult> {
    return this.automation.sendEnter();
  }
}
