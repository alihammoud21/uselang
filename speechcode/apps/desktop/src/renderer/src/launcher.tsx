import React from "react";
import { createRoot } from "react-dom/client";
import { LauncherShell } from "./components/LauncherShell";
import "./styles/global.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <LauncherShell />
  </React.StrictMode>
);
