# Offline And China Architecture

Core tutor text is local-only.

Required runtime path:

```text
user input (typed or speech transcript)
-> local on-device Gemma
-> response text
```

No cloud LLM provider is allowed for Quick Mode or Live Lang. The backend
`/api/tutor-session` and `/api/translate` routes are disabled for text
generation.

Cloud services may be optional only for:

- speech-to-text
- text-to-speech

They must not be required for core behavior and must degrade to local device
speech support when unavailable.

To keep the offline claim honest, Gemma model, tokenizer, and tokenizer_config
sources must be local/bundled `file://` resources. Remote model URLs are
rejected by the mobile Gemma engine.
