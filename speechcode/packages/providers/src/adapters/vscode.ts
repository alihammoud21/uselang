import type { AdapterResult, AppSettings, TargetAdapter } from "@speechcode/types";
import { DesktopAutomation } from "./automation";

const WINDOWS_VSCODE_COMMANDS = [
  `"Code"`,
  `"$env:LOCALAPPDATA\\Programs\\Microsoft VS Code\\Code.exe"`,
  `"$env:ProgramFiles\\Microsoft VS Code\\Code.exe"`
];

export class VsCodeTargetAdapter implements TargetAdapter {
  constructor(
    private readonly _settings: AppSettings,
    private readonly automation = new DesktopAutomation()
  ) {}

  async openTarget(): Promise<AdapterResult> {
    return this.automation.launchApp("Visual Studio Code", WINDOWS_VSCODE_COMMANDS);
  }

  async focusTarget(): Promise<AdapterResult> {
    const activation = await this.automation.activateApp([
      "Visual Studio Code",
      "Code"
    ]);
    if (!activation.ok) {
      return activation;
    }

    await this.automation.delay(420);
    return this.automation.focusPrimaryEditor("VS Code editor");
  }

  async insertPrompt(text: string): Promise<AdapterResult> {
    return this.automation.pasteText(text);
  }

  async sendPrompt(): Promise<AdapterResult> {
    return this.automation.sendEnter();
  }
}
