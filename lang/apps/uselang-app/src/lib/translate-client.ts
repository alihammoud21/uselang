// ── Translate client ─────────────────────────────────────────────────────────
// Gemma-only: ALL translation goes through on-device Gemma.
// No cloud LLM, no backend translation, no fallback models.
// If Gemma fails → error. No fake output.

import { chatWithGemma, getGemmaState } from "./gemma-engine";

const LANG_LABELS: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", "fr-CA": "Canadian French",
  de: "German", it: "Italian", pt: "Portuguese", "pt-BR": "Brazilian Portuguese",
  ja: "Japanese", ko: "Korean", zh: "Mandarin Chinese", ar: "Arabic",
  hi: "Hindi", tr: "Turkish", nl: "Dutch", sv: "Swedish",
  pl: "Polish", ru: "Russian",
};
function labelFor(code?: string) {
  if (!code) return "the source language";
  return LANG_LABELS[code] || LANG_LABELS[code.slice(0, 2)] || code;
}

export interface TranslateResult {
  translated: string;
  detectedSource: string;
  provider?: string;
}

// ── Output validation (CRITICAL) ─────────────────────────────────────────────
// If output === input AND languages differ → reject. Retry once. Then error.
function validateTranslation(
  result: TranslateResult,
  text: string,
  targetLang: string,
  sourceLang?: string,
): TranslateResult {
  const input = text.trim().toLowerCase();
  const output = result.translated.trim().toLowerCase();
  if (
    input &&
    output &&
    input === output &&
    targetLang !== (sourceLang || "en")
  ) {
    console.error(
      "[translate] VALIDATION FAILED: Gemma echoed input instead of translating.",
      { input: text, output: result.translated },
    );
    return {
      ...result,
      translated: "",
    };
  }
  return result;
}

// ── Public API — GEMMA ONLY ──────────────────────────────────────────────────
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string,
  options: { signal?: AbortSignal; forceOffline?: boolean } = {},
): Promise<TranslateResult> {
  if (options.signal?.aborted) throw new Error("Translation cancelled.");

  const gemmaState = getGemmaState();
  console.log("[translate] MODEL USED:", gemmaState.usingStub ? "STUB" : "GEMMA");
  console.log("[translate] INPUT:", JSON.stringify({ text, targetLang, sourceLang }));

  // Ensure model (or stub) is loaded
  if (!gemmaState.loaded) {
    console.log("[translate] Model not loaded. Triggering load…");
    const { loadGemmaModel } = require("./gemma-engine");
    await loadGemmaModel();
  }

  const reply = await chatWithGemma(
    [
      {
        role: "system",
        content: `You are a precise translator. Translate from ${labelFor(sourceLang)} into ${labelFor(targetLang)}. Reply with ONLY the translation - no quotes, no commentary.`,
      },
      { role: "user", content: text },
    ],
    { maxTokens: 256, temperature: 0.2 },
  );

  const translated = String(reply || "").trim();
  console.log("[translate] GEMMA OUTPUT:", JSON.stringify({ translated }));

  if (!translated) {
    throw new Error("Gemma returned empty translation.");
  }

  const result: TranslateResult = {
    translated,
    detectedSource: sourceLang || "",
    provider: "gemma",
  };

  // Validate: retry once if echoed
  const validated = validateTranslation(result, text, targetLang, sourceLang);
  if (!validated.translated) {
    // Retry once with stronger prompt
    console.log("[translate] Retrying Gemma with stronger prompt...");
    const retryReply = await chatWithGemma(
      [
        {
          role: "system",
          content: `CRITICAL: You must translate, NOT echo. Translate from ${labelFor(sourceLang)} into ${labelFor(targetLang)}. The input is NOT in ${labelFor(targetLang)}. Reply with ONLY the translation.`,
        },
        { role: "user", content: text },
      ],
      { maxTokens: 256, temperature: 0.3 },
    );
    const retryTranslated = String(retryReply || "").trim();
    console.log("[translate] GEMMA RETRY OUTPUT:", JSON.stringify({ retryTranslated }));

    if (!retryTranslated || retryTranslated.trim().toLowerCase() === text.trim().toLowerCase()) {
      throw new Error("Gemma failed to translate — echoed input after retry.");
    }
    return { translated: retryTranslated, detectedSource: sourceLang || "", provider: "gemma" };
  }

  return validated;
}
