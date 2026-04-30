# Lang Provider Setup

Core tutor text generation is local-only.

The app must not call OpenAI, Anthropic, Groq, or any other cloud LLM. Quick
Mode and Live Lang route user text/speech through local on-device Gemma.

## Local Gemma

The mobile app reads these public Expo variables:

- `EXPO_PUBLIC_GEMMA_MODEL_SOURCE`
- `EXPO_PUBLIC_GEMMA_TOKENIZER_SOURCE`
- `EXPO_PUBLIC_GEMMA_TOKENIZER_CONFIG_SOURCE`

They must point to bundled/local `file://` resources. Remote `http(s)` model
sources are rejected at runtime so the app can run without internet.

## Optional Cloud Services

Cloud services may be used only for optional speech/audio support and must not
be required for core app behavior.

Supported optional STT:

- `STT_PROVIDER=deepgram`
- `STT_PROVIDER=xfyun`

Supported optional TTS:

- `TTS_PROVIDER=deepgram`
- `TTS_PROVIDER=elevenlabs`

Do not configure LLM API keys. There is no `AI_PROVIDER`.

## Local Run

```bash
npm run api:dev
npm run mobile:dev
```

The backend `/api/tutor-session` and `/api/translate` routes are intentionally
disabled for text generation. Use the mobile local Gemma runtime instead.
