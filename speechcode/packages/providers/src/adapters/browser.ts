import type { AdapterResult, AppSettings, TargetAdapter } from "@speechcode/types";
import { DesktopAutomation } from "./automation";

const BROWSER_CANDIDATES =
  process.platform === "darwin"
    ? ["Arc", "Google Chrome", "Safari", "Microsoft Edge"]
    : ["Google Chrome", "Arc", "Microsoft Edge", "Mozilla Firefox"];

export class BrowserTargetAdapter implements TargetAdapter {
  constructor(
    private readonly settings: AppSettings,
    private readonly automation = new DesktopAutomation()
  ) {}

  async openTarget(): Promise<AdapterResult> {
    return this.automation.openUrl(this.settings.browserUrl);
  }

  async focusTarget(): Promise<AdapterResult> {
    const activation = await this.automation.activateApp(BROWSER_CANDIDATES);
    if (!activation.ok) {
      return activation;
    }

    await this.automation.delay(600);
    return this.automation.pressTabs(4);
  }

  async insertPrompt(text: string): Promise<AdapterResult> {
    return this.automation.pasteText(text);
  }

  async sendPrompt(): Promise<AdapterResult> {
    return this.automation.sendEnter();
  }
}
