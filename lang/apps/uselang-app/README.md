# UseLang

An AI-powered language learning app built with Expo (React Native). Learn Spanish, French, Mandarin, and more by speaking naturally. Powered by on-device Gemma AI — no internet required once the model is downloaded.

## Features

- **Quick Mode** — speak a phrase, get real-time pronunciation coaching
- **Phrase Mode** — master phrases chunk by chunk with AI feedback
- **Live Lang** — continuous live translator (Gemma-powered, no stubs)
- **Lessons** — structured curriculum for Spanish, French, Mandarin
- **AI Chatbot** — conversational AI assistant for grammar, vocab, culture & more
- **Globe** — unlock real-world locations as you progress
- **Games** — Flappy Sphere, Memory Match, Word Chase, Character Draw & more
- **Shop** — postcard packs, cosmetics, boosts, and game unlocks
- **Daily Spin** — free daily reward wheel popup on app open
- **Battle Pass** — level milestones with sphere, hint & badge rewards
- **100% offline AI** — Gemma 4 E2B runs on-device via LiteRT-LM

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Xcode | 16+ (for iOS) |
| CocoaPods | latest |
| Expo CLI | bundled via `npx` |

> **iOS only** — the app uses native Swift modules for speech recognition and on-device AI. Android support is not yet configured.

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/alihammoud21/uselang.git
cd uselang
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and set:

```
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8888
```

> For a physical device on your local Wi-Fi, replace `127.0.0.1` with your Mac's LAN IP (e.g. `192.168.1.42`). You can find it in System Preferences → Network.

### 4. Install iOS Pods

```bash
cd ios && pod install && cd ..
```

### 5. Run on iPhone (dev build required)

```bash
npx expo run:ios
```

This builds the native app and launches it in the iOS Simulator or a connected iPhone.

> **Note:** `npx expo start` (Expo Go) will not work because the app uses native modules (`react-native-litert-lm`, `OfflineVoiceModule`). You must use `expo run:ios`.

---

## Downloading the AI Model

When you first open Live Lang or the AI tutor, the app will prompt you to download the Gemma 4 E2B model (~2.5 GB). This is a one-time download cached on the device. After that everything runs 100% offline.

---

## Project Structure

```
app/              Expo Router screens (tabs + modals)
  (tabs)/         Main tab screens (Today, Speak/Train, Map, Learn, Settings)
  chatbot.tsx     AI chatbot assistant
  battle-pass.tsx Level milestone rewards
  flappy.tsx      Flappy Sphere game
  draw-game.tsx   Character Draw game
  shop.tsx        Shop (packs, games, cosmetics)
  collection.tsx  Postcard collection browser
  live.tsx        Live Lang translator
  quick-session.tsx  Quick pronunciation session
  phrase-lesson.tsx  Phrase chunk-by-chunk mode
src/
  components/     Reusable UI components
  lib/            Core logic (AI, speech, TTS, stores)
  data/           Lesson curricula (Spanish, French, Mandarin)
  hooks/          React hooks
ios/              Native iOS modules (Swift)
assets/           Fonts, images, sounds
```

---

## Key Libraries

| Library | Purpose |
|---------|---------|
| `expo-router` | File-based navigation |
| `react-native-litert-lm` | On-device Gemma AI (GPU inference) |
| `expo-speech-recognition` | Speech-to-text |
| `expo-speech` | Text-to-speech fallback |
| `react-native-reanimated` | Animations |
| `react-native-svg` | Progress rings, orb graphics |
| `nativewind` | Tailwind CSS for React Native |
| `@react-native-async-storage/async-storage` | Local data persistence |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | Tutor backend URL (local dev: `http://127.0.0.1:8888`) |
| `EXPO_PUBLIC_DEEPGRAM_TTS_API_KEY` | Optional — Deepgram TTS key for higher-quality voice. Falls back to expo-speech if absent. |

> Never commit your `.env` file. It is git-ignored by default.

---

## Troubleshooting

**App crashes on launch**
Run `cd ios && pod install` again, then clean the build in Xcode (`Product → Clean Build Folder`).

**Speech recognition not working**
Go to iPhone Settings → Privacy → Microphone / Speech Recognition and enable access for UseLang.

**AI model download fails**
Ensure you have ~3 GB of free storage and a stable Wi-Fi connection. The app will retry automatically.

**Metro bundler error after `npm install`**
```bash
npx expo start --clear
```
