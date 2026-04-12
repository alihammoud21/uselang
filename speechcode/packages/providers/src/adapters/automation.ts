import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { clipboard, shell } from "electron";
import type { AdapterResult } from "@speechcode/types";

const execFileAsync = promisify(execFile);

function ok(message: string): AdapterResult {
  return {
    ok: true,
    code: "ok",
    message
  };
}

function fail(
  code: AdapterResult["code"],
  message: string,
  detail?: string
): AdapterResult {
  return {
    ok: false,
    code,
    message,
    detail
  };
}

export class DesktopAutomation {
  async openUrl(url: string): Promise<AdapterResult> {
    if (!url) {
      return fail("invalid-config", "Add a browser URL before using the browser adapter.");
    }

    try {
      await shell.openExternal(url);
      return ok("Opened the selected browser target.");
    } catch (error) {
      return fail("launch-failed", "Could not open the selected browser target.", String(error));
    }
  }

  async launchApp(appName: string, windowsCommands: string[]): Promise<AdapterResult> {
    if (process.platform === "darwin") {
      try {
        await execFileAsync("open", ["-a", appName]);
        return ok(`Opened ${appName}.`);
      } catch (error) {
        return fail("launch-failed", `Could not open ${appName}.`, String(error));
      }
    }

    if (process.platform === "win32") {
      for (const command of windowsCommands) {
        try {
          await execFileAsync("powershell.exe", [
            "-NoProfile",
            "-Command",
            `Start-Process ${command}`
          ]);
          return ok(`Opened ${appName}.`);
        } catch {
          continue;
        }
      }

      return fail("launch-failed", `Could not open ${appName}.`);
    }

    return fail("unsupported-platform", "This adapter currently supports macOS and Windows only.");
  }

  async activateApp(appNames: string[]): Promise<AdapterResult> {
    if (process.platform === "darwin") {
      for (const appName of appNames) {
        try {
          await execFileAsync("osascript", [
            "-e",
            `tell application "${appName}" to activate`
          ]);
          return ok(`Focused ${appName}.`);
        } catch {
          continue;
        }
      }

      return fail("focus-failed", "Could not focus the selected app.");
    }

    if (process.platform === "win32") {
      for (const appName of appNames) {
        try {
          await execFileAsync("powershell.exe", [
            "-NoProfile",
            "-Command",
            `$wshell = New-Object -ComObject WScript.Shell; if ($wshell.AppActivate("${appName}")) { exit 0 } else { exit 1 }`
          ]);
          return ok(`Focused ${appName}.`);
        } catch {
          continue;
        }
      }

      return fail("focus-failed", "Could not focus the selected app.");
    }

    return fail("unsupported-platform", "This adapter currently supports macOS and Windows only.");
  }

  async pasteText(text: string): Promise<AdapterResult> {
    clipboard.writeText(text);

    if (process.platform === "darwin") {
      return this.runAppleScript(
        `tell application "System Events" to keystroke "v" using command down`,
        "Inserted the prepared prompt.",
        "insert-failed",
        "Could not paste into the selected app."
      );
    }

    if (process.platform === "win32") {
      return this.runPowerShell(
        `$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys("^v")`,
        "Inserted the prepared prompt.",
        "insert-failed",
        "Could not paste into the selected app."
      );
    }

    return fail("unsupported-platform", "Prompt pasting currently supports macOS and Windows only.");
  }

  async sendEnter(): Promise<AdapterResult> {
    if (process.platform === "darwin") {
      return this.runAppleScript(
        `tell application "System Events" to key code 36`,
        "Sent the prompt.",
        "send-failed",
        "Could not send the prompt automatically."
      );
    }

    if (process.platform === "win32") {
      return this.runPowerShell(
        `$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys("{ENTER}")`,
        "Sent the prompt.",
        "send-failed",
        "Could not send the prompt automatically."
      );
    }

    return fail("unsupported-platform", "Auto-send currently supports macOS and Windows only.");
  }

  async pressTabs(count: number): Promise<AdapterResult> {
    if (process.platform === "darwin") {
      return this.runAppleScript(
        Array.from({ length: count }, () => `tell application "System Events" to key code 48`).join(
          "\n"
        ),
        "Stepped through the target input.",
        "focus-failed",
        "Could not move focus inside the selected app."
      );
    }

    if (process.platform === "win32") {
      return this.runPowerShell(
        `$wshell = New-Object -ComObject WScript.Shell; ${Array.from(
          { length: count },
          () => "$wshell.SendKeys('{TAB}')"
        ).join("; ")}`,
        "Stepped through the target input.",
        "focus-failed",
        "Could not move focus inside the selected app."
      );
    }

    return fail("unsupported-platform", "Input focus helpers currently support macOS and Windows only.");
  }

  async focusPrimaryEditor(appLabel = "editor"): Promise<AdapterResult> {
    if (process.platform === "darwin") {
      return this.runAppleScript(
        [
          `tell application "System Events"`,
          `key code 53`,
          `keystroke "1" using command down`,
          `end tell`
        ].join("\n"),
        `Focused ${appLabel}.`,
        "focus-failed",
        `Could not focus the ${appLabel}.`
      );
    }

    if (process.platform === "win32") {
      return this.runPowerShell(
        `$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys("{ESC}"); $wshell.SendKeys("^1")`,
        `Focused ${appLabel}.`,
        "focus-failed",
        `Could not focus the ${appLabel}.`
      );
    }

    return fail("unsupported-platform", `${appLabel} focus currently supports macOS and Windows only.`);
  }

  async delay(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private async runAppleScript(
    script: string,
    successMessage: string,
    errorCode: AdapterResult["code"],
    failureMessage: string
  ): Promise<AdapterResult> {
    try {
      await execFileAsync("osascript", ["-e", script]);
      return ok(successMessage);
    } catch (error) {
      return fail(errorCode, failureMessage, String(error));
    }
  }

  private async runPowerShell(
    script: string,
    successMessage: string,
    errorCode: AdapterResult["code"],
    failureMessage: string
  ): Promise<AdapterResult> {
    try {
      await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script]);
      return ok(successMessage);
    } catch (error) {
      return fail(errorCode, failureMessage, String(error));
    }
  }
}
