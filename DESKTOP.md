# UseLang Desktop

This document covers the desktop-specific layer built on top of the existing `lang/` web app.

## Structure

```
Lang/
├── lang/                          # Web app (React + Vite + Firebase)
│   └── apps/web/src/
│       ├── pages/                 # LearningPage, TrainerPage, SettingsPage …
│       ├── components/            # AISphere, PronunciationDiagram, AppShell …
│       └── App.jsx                # Hash-based router
│
├── speechcode/apps/desktop/       # Electron desktop shell
│   ├── src/main/                  # Main process (Node/Electron)
│   │   ├── index.ts               # Bootstrap
│   │   ├── window-manager.ts      # Main window + Launcher window
│   │   ├── hotkeys.ts             # Global shortcut (Cmd+Shift+Space)
│   │   ├── ipc.ts                 # IPC handlers
│   │   ├── tray-manager.ts        # System tray
│   │   └── app-controller.ts      # Business logic + SQLite session store
│   │
│   ├── src/preload/index.ts       # contextBridge — exposes electronAPI
│   │
│   └── src/renderer/              # Renderer process (React)
│       ├── index.html             # Main window entry
│       ├── launcher.html          # Launcher window entry
│       └── src/
│           ├── App.tsx            # Desktop shell + routing
│           ├── launcher.tsx       # Launcher entry point
│           ├── components/
│           │   ├── DesktopAppShell.tsx    # Sidebar nav, offline banner
│           │   ├── LauncherShell.tsx      # Quick launcher UI
│           │   └── PronunciationCoach.tsx # Sound lessons + SVG diagrams
│           ├── hooks/
│           │   └── useDesktopStore.ts     # Clipboard, network status
│           └── styles/global.css          # Design tokens + base styles
│
└── .github/workflows/
    ├── ci.yml                     # Lint + typecheck on push/PR
    └── release.yml                # Cross-platform builds on tag push
```

## Quick start

```bash
# Install
cd speechcode
pnpm install

# Dev (Electron + hot reload)
cd apps/desktop
pnpm dev

# Build renderer only
pnpm build

# Package installers
pnpm package:mac    # → release/*.dmg
pnpm package:win    # → release/*.exe
pnpm exec electron-builder --linux AppImage deb
```

## Global shortcut

Default: **Cmd+Shift+Space** (macOS) / **Ctrl+Shift+Space** (Windows/Linux)

Customisable in Settings. Registered via Electron `globalShortcut`. Toggles the Launcher window.

## Two windows

| Window | Size | Behaviour |
|---|---|---|
| Main | 1320×860, min 1100×760 | Hidden on close, shown from tray |
| Launcher | 640×80 collapsed, 640×480 expanded | Frameless, transparent, always-on-top, hides on blur |

## IPC channels

| Channel | Direction | Purpose |
|---|---|---|
| `settings:get/save` | renderer→main | App settings |
| `dashboard:get/changed` | bidirectional | Session history |
| `session:start` | renderer→main | Start a practice session |
| `launcher:hide/expand/collapse/open-main` | renderer→main | Launcher controls |
| `launcher:activated` | main→renderer | Focus input on show |
| `clipboard:watch:start/stop` | renderer→main | Toggle clipboard polling |
| `clipboard:changed` | main→renderer | New clipboard text |

## Release

Push a tag `v*` to trigger the GitHub Actions release workflow.
Builds run in parallel on macOS, Windows, and Ubuntu.
Artifacts are uploaded as a draft GitHub Release.
