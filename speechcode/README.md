# SpeechCode

SpeechCode is a Phase 1 desktop product scaffold for macOS and Windows. It lets a user choose a default coding target, trigger a floating overlay, turn a rough spoken request into a cleaner prompt with deterministic local logic, persist the session in SQLite, and send the prompt into a real adapter flow.

## What is included

- Electron desktop app with secure preload bridge and `contextIsolation: true`
- Onboarding flow and persistent settings
- Global hotkey plus a visible in-app quick trigger
- SQLite-backed session history, step tracking, and settings
- Plain-English dashboard for sessions and progress
- Real browser/generic adapter and real Cursor adapter, both called from the main session flow
- Marketing website scaffold
- `electron-builder` packaging for macOS `.dmg` and Windows `.exe`

## Monorepo layout

```text
speechcode/
  apps/
    desktop/
    website/
  packages/
    licensing/
    providers/
    session/
    shared/
    types/
```

## Getting started

1. Enable Corepack if `pnpm` is not already installed:

   ```bash
   corepack enable
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Build all packages and apps:

   ```bash
   pnpm build
   ```

4. Run the full workspace after install with one command:

   ```bash
   pnpm dev
   ```

5. Run the desktop app only:

   ```bash
   pnpm dev:desktop
   ```

6. Run the marketing website only:

   ```bash
   pnpm dev:website
   ```

## Packaging

Build the desktop release bundle:

```bash
pnpm package:desktop
```

This produces installable artifacts in [`apps/desktop/release`](/Users/alihammoud/Documents/Playground/speechcode/apps/desktop/release).

## Phase 1 scope

- No speech-to-text provider integration yet
- No advanced AI enhancement providers
- No billing providers or checkout flows
- No live AI execution tracking outside the session step updates that the desktop app persists locally
- Global hotkey support exists, and the desktop UI also exposes a visible quick trigger for development and testing
- If no desktop adapter is configured, the app falls back to the browser adapter in the default flow
- Adapter prompt insertion uses a real clipboard write plus OS-level paste attempt
- Adapter failures surface plain-English errors in the UI without crashing the app
