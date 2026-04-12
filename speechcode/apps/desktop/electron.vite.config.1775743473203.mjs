// electron.vite.config.ts
import path from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
var __electron_vite_injected_dirname = "/Users/alihammoud/Documents/Playground/speechcode/apps/desktop";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: "src/renderer",
    plugins: [react()],
    resolve: {
      alias: {
        "@renderer": path.resolve(__electron_vite_injected_dirname, "src/renderer/src")
      }
    },
    build: {
      outDir: "../../dist/renderer"
    }
  }
});
export {
  electron_vite_config_default as default
};
