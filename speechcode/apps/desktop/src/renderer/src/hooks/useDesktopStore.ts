import { useEffect, useState } from "react";

declare global {
  interface Window {
    electronAPI?: {
      isDesktop: boolean;
      platform: string;
      getSettings: () => Promise<unknown>;
      saveSettings: (s: unknown) => Promise<unknown>;
      getDashboard: () => Promise<unknown>;
      onDashboardChanged: (cb: (data: unknown) => void) => void;
      startSession: (input: unknown) => Promise<unknown>;
      hideLauncher: () => void;
      expandLauncher: () => void;
      collapseLauncher: () => void;
      openMain: () => void;
      onLauncherActivated: (cb: () => void) => void;
      startClipboardWatch: () => void;
      stopClipboardWatch: () => void;
      readClipboard: () => Promise<string>;
      onClipboardChanged: (cb: (text: string) => void) => void;
    };
  }
}

export const isDesktop = () =>
  typeof window !== "undefined" && !!window.electronAPI?.isDesktop;

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
