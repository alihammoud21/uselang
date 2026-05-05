# Go Live Simulator

Go Live Simulator is a local-only Electron desktop game prototype. The player chooses a fake stream platform style, enables optional local camera/microphone signals, goes live in a simulated stream, completes tasks, opens packs, buys/equips overlays and moderators, and tries to reach 1,000,000 subscribers.

## Privacy

This is not a real streaming app.

- Camera and microphone are used only on the player's computer.
- Nothing is streamed, recorded, uploaded, stored remotely, or sent online.
- The renderer Content Security Policy blocks network connections.
- Twitch, YouTube, Kick, Stripe, and Steam APIs are not used.
- The game remains playable with camera and microphone disabled.

## Install

```bash
npm install
```

## Run In Development

```bash
npm run dev
```

Electron will open the desktop app. The first flow asks the player to choose Twitch, YouTube, or Kick, then shows the local-only camera/microphone permission screen.

## Build

```bash
npm run build
```

This compiles Electron main, preload, and renderer output.

## Package Installers

```bash
npm run package
npm run package:mac
npm run package:win
npm run package:linux
```

Installer output is written to `release/`.

## MVP Complete

- Electron + React + TypeScript + Vite setup.
- Electron Builder packaging scripts for macOS, Windows, and Linux.
- Start/platform select, privacy screen, dashboard, shop, wardrobe, moderators, live stream, stream results, and settings.
- Local save state in `localStorage`.
- Local webcam preview with motion score.
- Local microphone level score.
- Button-only fallback gameplay.
- Fake chat, fake donations, hype, energy, viewer, subscriber, milestone, and stream results systems.
- Shop with individual items, pack opening, rarity reveal, moderators, overlays, equipment, and platform skins.
- Mock Stream Credits redemption with `GO-LIVE-MVP`; no real payment processing.

## Phase 2 Ideas

- Steamworks purchase and achievement integration.
- Real payment adapter only after legal/product review.
- Stronger motion/face detection that still stays local.
- More camera overlay effects and animated alerts.
- More stream types and mini-games.
- Career story mode and sponsorship events.
- Controller support and Steam Cloud save support.
