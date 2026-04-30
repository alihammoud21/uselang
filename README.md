# UseLang

**On-device AI language tutor.** Learn Mandarin, Spanish, French, and more with a private, offline-first experience powered by Google's Gemma 4 model running directly on your phone's GPU.

> **100% offline after first model download.** No cloud APIs required. Works in China.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      UseLang App (Expo)                      │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Today    │  │  Speak   │  │  Learn   │  │  Settings  │  │
│  │  (Home)   │  │  (Train) │  │ (Lessons)│  │            │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────────┘  │
│       │              │              │                         │
│       ▼              ▼              ▼                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              On-Device AI Layer                       │   │
│  │  ┌─────────────────┐    ┌────────────────────────┐   │   │
│  │  │  Gemma 4 E2B     │    │   Deterministic Stub   │   │   │
│  │  │  (LiteRT-LM GPU) │◄──►│   (offline fallback)   │   │   │
│  │  └─────────────────┘    └────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                TTS Router                             │   │
│  │  ┌────────────────┐      ┌─────────────────────┐    │   │
│  │  │ Deepgram Cloud  │      │  Apple Native TTS   │    │   │
│  │  │ (online, en/es/ │──OR──│  (offline, all langs)│    │   │
│  │  │  fr/de voices)  │      │  zh/ja/ko/etc.      │    │   │
│  │  └────────────────┘      └─────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Speech Recognition                         │   │
│  │  Apple on-device SFSpeechRecognizer (no network)     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Voice Interaction Flow

```
User speaks ──► Apple STT ──► Gemma AI ──► TTS Router ──► Audio out
   (1.4s           (on-device)    (on-device    (Deepgram or
    silence                        GPU, 1 call)   Apple native)
    detection)
                        │
              ┌─────────┴──────────┐
              │  Single combined   │
              │  prompt returns:   │
              │  • Translation     │
              │  • Pronunciation   │
              │  guide             │
              └────────────────────┘
              Background (non-blocking):
              • Word breakdown
              • Tips
```

**Latency targets:** 2–5s full round-trip (speak → hear response).

## Monorepo Structure

```
├── lang/                      ◄── UseLang language learning app
│   ├── apps/
│   │   ├── uselang-app/       ◄── React Native (Expo) mobile app  ★ MAIN APP
│   │   ├── ios/               ◄── Native iOS shell (Swift, Xcode)
│   │   └── web/               ◄── Marketing site (Vite)
│   ├── server/                ◄── Optional API server
│   ├── netlify/               ◄── Serverless functions (auth, STT proxy)
│   └── README.md              ◄── Detailed docs for the lang app
│
└── speechcode/                ◄── SpeechCode desktop app (separate project)
```

## App Screens

| Screen | File | Description |
|--------|------|-------------|
| **Today** | `app/(tabs)/index.tsx` | Home dashboard — streak, XP, daily challenge, explore section |
| **Speak** | `app/(tabs)/train.tsx` | Voice tutor — Quick mode (type/speak → AI responds) and Phrase mode |
| **Learn** | `app/(tabs)/lessons.tsx` | Structured lessons — vocab, exercises, scenarios for zh/es/fr |
| **Globe** | `app/(tabs)/globe.tsx` | 3D Earth with unlocked map locations |
| **Plan** | `app/(tabs)/plan.tsx` | Curriculum planner based on user's goal |
| **Settings** | `app/(tabs)/settings.tsx` | Profile, language, tutor style, theme, notifications |
| **Quick Session** | `app/quick-session.tsx` | Full-screen tutor response with tongue diagrams, live transcript |
| **Library** | `app/library.tsx` | Saved phrases with replay, user recordings, tongue placement |
| **Camera** | `app/camera.tsx` | Live Coach mode — pronunciation coaching via front camera |
| **Lesson** | `app/lesson.tsx` | Active lesson with 8 exercise types, progress, Ask Tutor |
| **Onboarding** | `app/onboarding.tsx` | 7-step onboarding with language, goal, commitment selection |
| **Shop** | `app/shop.tsx` | Cosmetic shop + promo code redemption |

## Key Technologies

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native + Expo SDK 53 |
| **Routing** | Expo Router (file-based) |
| **AI Model** | Gemma 4 E2B via `react-native-litert-lm` (Metal GPU on iOS) |
| **Speech Recognition** | Apple `SFSpeechRecognizer` via `expo-speech-recognition` |
| **Text-to-Speech** | Deepgram Aura (online) / Apple `AVSpeechSynthesizer` (offline) |
| **Audio** | `expo-av` for recording and playback |
| **Storage** | AsyncStorage (local, no cloud required) |
| **Animations** | `react-native-reanimated` |
| **Styling** | Inline styles with design tokens (warm paper palette) |
| **Fonts** | Geist (UI), Fraunces (headings) |

## Offline & China Compatibility

```
┌──────────────────────────────────────────────────────────────┐
│                    Network Conditions                          │
├──────────────────┬───────────────────┬───────────────────────┤
│   Full Internet  │  China (no VPN)   │  Airplane Mode        │
├──────────────────┼───────────────────┼───────────────────────┤
│ AI: Gemma (GPU)  │ AI: Gemma (GPU)   │ AI: Gemma (GPU)       │
│ TTS: Deepgram    │ TTS: Apple native │ TTS: Apple native     │
│ STT: Apple local │ STT: Apple local  │ STT: Apple local      │
│ Auth: server     │ Auth: skip/local  │ Auth: skip/local      │
│ Model DL: ✅     │ Model DL: ✅*     │ Model DL: ❌ (stub)   │
├──────────────────┴───────────────────┴───────────────────────┤
│ * HuggingFace is accessible in China (not blocked by GFW)    │
│ * Google services ARE blocked — app uses Apple/Cloudflare    │
│   captive-portal probes for connectivity detection            │
│ * Deepgram is blocked — TTS automatically falls to Apple     │
│ * If model can't download, deterministic stub serves          │
│   responses so the app always works                           │
└──────────────────────────────────────────────────────────────┘
```

## For App Store Submission

### Prerequisites

1. **Mac with Xcode 15+** installed
2. **Apple Developer account** ($99/year)
3. **Node.js 18+** and npm

### Step-by-Step

```bash
# 1. Clone the repo
git clone https://github.com/alihammoud21/Lang.git
cd Lang/lang

# 2. Install root dependencies
npm install

# 3. Install app dependencies
cd apps/uselang-app
npm install

# 4. (Optional) Set Deepgram key for premium cloud voices
#    Without this, all TTS uses Apple's built-in voices (still good).
echo 'EXPO_PUBLIC_DEEPGRAM_TTS_API_KEY=your_key_here' > .env

# 5. Generate native iOS project
npx expo prebuild --platform ios

# 6. Install CocoaPods
cd ios && pod install && cd ..

# 7. Open in Xcode
open ios/UseLang.xcworkspace
```

### In Xcode

1. **Select your Team** in Signing & Capabilities (your Apple Developer account)
2. **Set the Bundle Identifier** to your registered App ID (default: `com.uselang.app`)
3. **Select "Any iOS Device (arm64)"** as build target
4. **Product → Archive**
5. **Distribute App → App Store Connect**
6. In App Store Connect, fill in:
   - App name, description, keywords
   - Screenshots (6.7" iPhone 15 Pro Max + 6.1" iPhone 15)
   - Privacy policy URL
   - App category: Education
   - Age rating: 4+

### App Store Required Assets

| Asset | Size | Status |
|-------|------|--------|
| App Icon | 1024×1024 PNG (no alpha) | ⚠️ **Add at** `lang/apps/uselang-app/assets/icon.png` |
| Splash Screen | 1284×2778 PNG | ⚠️ **Add at** `lang/apps/uselang-app/assets/splash.png` |
| Screenshots | 6.7" and 6.1" sizes | Take on Simulator or real device |

### `app.json` — What to Customize

```jsonc
{
  "expo": {
    "name": "UseLang",           // App Store display name
    "version": "1.0.0",          // Bump for each submission
    "ios": {
      "bundleIdentifier": "com.uselang.app",  // Must match Apple Developer portal
      "buildNumber": "1",        // Increment for each build
      "supportsTablet": true,
      "icon": "./assets/icon.png"  // ⚠️ Add this
    }
  }
}
```

### Privacy & Permissions

The app requests these permissions (already configured in `app.json`):

| Permission | Why | Required? |
|-----------|-----|----------|
| Microphone | Practice speaking languages | Yes (core feature) |
| Speech Recognition | Understand pronunciation | Yes (core feature) |
| Camera | Live Coach pronunciation mode | Optional |

**For App Store Review:** The app works fully offline. No user data leaves the device. AI runs on-device via Gemma. Voice data is processed by Apple's on-device speech recognizer. The optional Deepgram TTS is for premium voice quality only — the app works without it.

## Environment Variables

| Variable | Required? | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_DEEPGRAM_TTS_API_KEY` | No | Enables premium Deepgram voices for en/es/fr/de. Without it, Apple native TTS is used (works great). |
| `DEEPGRAM_STT_API_KEY` | No | For the optional server-side STT proxy. The app uses Apple's on-device STT by default. |

## Development

```bash
# Start Metro bundler for physical device
cd lang/apps/uselang-app
npx expo start

# Run on iOS Simulator
npx expo run:ios

# TypeScript check
npx tsc --noEmit
```

## Performance Optimizations

| Optimization | Before | After |
|-------------|--------|-------|
| AI calls per turn | 4 sequential | **1 combined** + background breakdown |
| Deepgram TTS timeout | 8s + retry (16s worst) | **4s, no retry** → instant native fallback |
| TTS replay | Re-fetches each time | **In-memory LRU cache** (10 entries) |
| Silence detection | 2.0s | **1.4s** |
| Gemma GPU warmup | On conversation start | **On tab mount** |
| Connectivity probe | Google (blocked in China) | **Apple + Cloudflare** |
| Deepgram safety timeout | Fixed 30s | **Proportional** to text (5–15s) |

## Notes

- The server (`lang/server/`, `lang/netlify/`) is **optional**. The mobile app works fully standalone.
- Firebase/Firestore is referenced in old web code only. The React Native app uses AsyncStorage exclusively.
- `lang/apps/web/` is the marketing website, not the mobile app.
- `lang/apps/ios/` has a native Swift iOS shell with offline lesson fallback (separate from the Expo app).
- `speechcode/` is a separate desktop app project — not related to the mobile app.
