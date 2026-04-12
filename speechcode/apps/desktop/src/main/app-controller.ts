import { EventEmitter } from "node:events";
import { Notification, app } from "electron";
import { createTargetAdapter } from "@speechcode/providers";
import { cleanPrompt, inferActionLabel } from "@speechcode/shared";
import { SqliteSessionStore } from "@speechcode/session";
import type {
  AdapterResult,
  AppSettings,
  DashboardData,
  PreparedPrompt,
  SaveSettingsInput,
  SessionFlowResult,
  SessionSubmission
} from "@speechcode/types";

export class SpeechCodeController extends EventEmitter {
  private readonly store = new SqliteSessionStore(app.getPath("userData"));

  private getTargetLabel(target: AppSettings["defaultTarget"]): string {
    if (target === "cursor") {
      return "Cursor";
    }

    if (target === "browser") {
      return "your browser target";
    }

    return "VS Code";
  }

  private resolveTarget(settings: AppSettings): AppSettings["defaultTarget"] {
    if (settings.defaultTarget === "cursor") {
      return "cursor";
    }

    if (settings.defaultTarget === "browser") {
      return "browser";
    }

    return "vscode";
  }

  async init(): Promise<void> {
    await this.store.init();
  }

  async getSettings(): Promise<AppSettings> {
    return this.store.getSettings();
  }

  async saveSettings(settings: SaveSettingsInput): Promise<AppSettings> {
    const saved = await this.store.saveSettings(settings);
    this.emit("settings:changed", saved);
    await this.emitDashboard();
    return saved;
  }

  async getDashboard(): Promise<DashboardData> {
    return this.store.getDashboardData();
  }

  async preparePrompt(rawInput: string, mode: AppSettings["mode"]): Promise<PreparedPrompt> {
    return cleanPrompt(rawInput, mode);
  }

  async startSession(input: SessionSubmission): Promise<SessionFlowResult> {
    const settings = await this.store.getSettings();
    const selectedTarget = this.resolveTarget(settings);
    const prepared = input.cleanedPrompt
      ? {
          rawInput: input.rawInput,
          cleanedPrompt: input.cleanedPrompt,
          mode: input.mode,
          actionLabel: inferActionLabel(input.cleanedPrompt)
        }
      : cleanPrompt(input.rawInput, input.mode);
    const preparedWithEnhancements = input.cleanedPrompt
      ? prepared
      : cleanPrompt(input.rawInput, input.mode, input.enhancements ?? []);

    const session = await this.store.createSession({
      rawInput: input.rawInput,
      cleanedPrompt: preparedWithEnhancements.cleanedPrompt,
      target: selectedTarget,
      mode: input.mode,
      status: "running"
    });

    await this.store.addSessionStep({
      sessionId: session.id,
      stepName: "captured_request",
      status: "completed"
    });
    await this.store.addSessionStep({
      sessionId: session.id,
      stepName: "preparing_prompt",
      status: "completed"
    });
    await this.emitDashboard(session.id);

    const adapter = createTargetAdapter({
      ...settings,
      defaultTarget: selectedTarget
    });
    const adapterResults: AdapterResult[] = [];

    const targetLabel = this.getTargetLabel(selectedTarget);
    const openResult = await this.runAdapterStep(
      session.id,
      "opening_target",
      () => adapter.openTarget(),
      `Opening ${targetLabel}`
    );
    adapterResults.push(openResult);
    if (!openResult.ok) {
      await this.store.updateSessionStatus(session.id, "failed");
      await this.emitDashboard(session.id);
      return this.getResult(session.id, adapterResults);
    }

    const focusResult = await this.runAdapterStep(
      session.id,
      "focusing_target",
      () => adapter.focusTarget(),
      `Focusing ${targetLabel}`
    );
    adapterResults.push(focusResult);
    if (!focusResult.ok) {
      await this.store.updateSessionStatus(session.id, "failed");
      await this.emitDashboard(session.id);
      return this.getResult(session.id, adapterResults);
    }

    const insertResult = await this.runAdapterStep(
      session.id,
      "inserting_prompt",
      () => adapter.insertPrompt(preparedWithEnhancements.cleanedPrompt),
      preparedWithEnhancements.actionLabel
    );
    adapterResults.push(insertResult);
    if (!insertResult.ok) {
      await this.store.updateSessionStatus(session.id, "failed");
      await this.emitDashboard(session.id);
      return this.getResult(session.id, adapterResults);
    }

    if (settings.autoSend && adapter.sendPrompt) {
      const sendResult = await this.runAdapterStep(session.id, "sending_prompt", () =>
        adapter.sendPrompt!()
      );
      adapterResults.push(sendResult);
      if (!sendResult.ok) {
        await this.store.updateSessionStatus(session.id, "failed");
        await this.emitDashboard(session.id);
        return this.getResult(session.id, adapterResults);
      }
    }

    await this.store.updateSessionStatus(session.id, "completed");
    await this.store.addSessionStep({
      sessionId: session.id,
      stepName: "flow_complete",
      status: "completed"
    });
    this.showNotification(
      selectedTarget === "vscode"
        ? "Your prompt is ready in VS Code"
        : selectedTarget === "cursor"
          ? "Your prompt is ready in Cursor"
          : "Prompt inserted successfully"
    );
    await this.emitDashboard(session.id);
    return this.getResult(session.id, adapterResults);
  }

  private async getResult(
    sessionId: string,
    adapterResults: AdapterResult[]
  ): Promise<SessionFlowResult> {
    const dashboard = await this.store.getDashboardData(sessionId);
    const session = dashboard.sessions.find((entry) => entry.id === sessionId);

    if (!session) {
      throw new Error("Session could not be loaded after execution.");
    }

    return {
      session,
      adapterResults
    };
  }

  private async runAdapterStep(
    sessionId: string,
    stepName: string,
    action: () => Promise<AdapterResult>,
    runningMessage?: string
  ): Promise<AdapterResult> {
    await this.store.addSessionStep({
      sessionId,
      stepName,
      status: "running",
      message: runningMessage
    });
    await this.emitDashboard(sessionId);

    const result = await action();

    await this.store.addSessionStep({
      sessionId,
      stepName,
      status: result.ok ? "completed" : "failed",
      message: result.message
    });
    if (!result.ok) {
      this.showNotification(result.message);
    }
    await this.emitDashboard(sessionId);
    return result;
  }

  private async emitDashboard(selectedSessionId?: string): Promise<void> {
    this.emit("dashboard:changed", await this.store.getDashboardData(selectedSessionId));
  }

  private showNotification(body: string): void {
    if (!Notification.isSupported()) {
      return;
    }

    new Notification({
      title: "SpeechCode",
      body
    }).show();
  }
}
