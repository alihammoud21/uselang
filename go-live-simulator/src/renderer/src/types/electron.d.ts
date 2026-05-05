export {};

declare global {
  interface Window {
    goLive?: {
      toggleFullscreen: () => Promise<boolean>;
      quit: () => Promise<void>;
    };
  }
}
