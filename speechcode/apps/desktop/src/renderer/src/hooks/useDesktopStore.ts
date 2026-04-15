import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    electronAPI?: {
      isDesktop: boolean;
      platform: string;
      getSettings: () => Promise<unknown>;
      saveSettings: (s: unknown) => Promise<unknown>;
      onSettingsOpen: (cb: () => void) => void;
      getDashboard: () => Promise<unknown>;
      onDashboardChanged: (cb: (data: unknown) => void) => void;
      startSession: (input: unknown) => Promise<unknown>;
      preparePrompt: (raw: string, mode: string) => Promise<unknown>;
      hideLauncher: () => void;
      expandLauncher: () => void;
      collapseLauncher: () => void;
      openMain: () => void;
      onLauncherActivated: (cb: () => void) => void;
      startClipboardWatch: () => void;
      stopClipboardWatch: () => void;
      readClipboard: () => Promise<string>;
      onClipboardChanged: (cb: (text: string) => void) => void;
      minimizeWindow: () => void;
    };
  }
}

export const isDesktop = () =>
  typeof window !== "undefined" && !!window.electronAPI?.isDesktop;

// ── Clipboard offer ──────────────────────────────────────────────────────────
export function useClipboardOffer() {
  const [clipboardText, setClipboardText] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    window.electronAPI!.startClipboardWatch();
    window.electronAPI!.onClipboardChanged((text) => {
      setClipboardText(text);
      setVisible(true);
    });
    return () => {
      window.electronAPI!.stopClipboardWatch();
    };
  }, []);

  return { clipboardText, visible, dismiss: () => setVisible(false) };
}

// ── Network status ───────────────────────────────────────────────────────────
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return isOnline;
}

// ── Settings ─────────────────────────────────────────────────────────────────
export function useSettings() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktop()) {
      setLoading(false);
      return;
    }
    window.electronAPI!.getSettings()
      .then((s) => setSettings(s as Record<string, unknown>))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (updated: Record<string, unknown>) => {
    if (!isDesktop()) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await window.electronAPI!.saveSettings(updated);
      setSettings(saved as Record<string, unknown>);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, loading, saving, error, save };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function useDashboard() {
  const [dashboard, setDashboard] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isDesktop()) {
      setLoading(false);
      return;
    }
    window.electronAPI!.getDashboard()
      .then(setDashboard)
      .finally(() => setLoading(false));

    window.electronAPI!.onDashboardChanged((data) => {
      setDashboard(data);
    });
  }, []);

  return { dashboard, loading };
}
