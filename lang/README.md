# Lang

Voice-first language practice built with React, Vite, Tailwind CSS, Framer Motion, Netlify Functions, Firebase Auth, Firestore, and Deepgram.

## What ships in Phase 1

- Marketing site with hero, how-it-works, features, pricing, FAQ, and footer
- Email/password auth flow
- Onboarding saved to Firestore
- Voice workspace with:
  - tap-to-record sphere
  - Deepgram STT transcription
  - structured tutor response logic
  - Deepgram TTS playback
  - pronunciation heatmap
  - session history
  - daily minute limits
- Settings page
- PWA manifest, service worker, and install prompt
- Firestore rules for user-owned documents only

## Project structure

- `apps/web` - Vite app and UI
- `lib` - shared lesson, language, and correction logic
- `netlify/functions` - serverless voice pipeline
- `firebase` - Firestore rules and indexes

## Required environment variables

Create `.env` in the project root:

```bash
DEEPGRAM_STT_API_KEY=...
DEEPGRAM_TTS_API_KEY=...
```

The Firebase web config is already wired in the client REST layer from the values you provided.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. For Netlify function routing in local development, run through Netlify CLI if you have it installed globally:

```bash
netlify dev
```

## Firestore rules

Deploy the rules in `firebase/firestore.rules` so users can only read and write their own profile and session documents.

## Deploy to Netlify

1. Set `DEEPGRAM_STT_API_KEY` and `DEEPGRAM_TTS_API_KEY` in Netlify environment variables.
2. Make sure Firestore rules are deployed.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Functions directory: `netlify/functions`

## Notes

- The voice pipeline uses Deepgram's `/v1/listen` and `/v1/speak` REST APIs.
- Tutor logic is intentionally structured and deterministic for Phase 1. It does not depend on OpenAI.
- ElevenLabs keys were not used because the requested stack locked speech to Deepgram.
