/// <reference types="vite/client" />

import type { SpeechCodeApi } from "@speechcode/types";

declare global {
  interface Window {
    speechcode?: SpeechCodeApi;
  }
}
