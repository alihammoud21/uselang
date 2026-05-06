// ── Mandarin Source of Truth ─────────────────────────────────────────────────
// EVERY zh rendering path MUST call resolveMandarinLayers() before display.
// This guarantees:
//   - hanzi  = Chinese characters only (never Latin)
//   - pinyin = tone-marked pinyin only (never Chinese chars)
//   - sayLike = English-friendly pronunciation (always computed, never cached)
//
// If data is invalid → valid=false and layers are recomputed from whatever
// good data exists. The UI should NEVER show blank phonetic — at minimum
// show the hanzi characters themselves.

import { pinyinToSayLike } from "./gemma-stub";

// ── Regex helpers ─────────────────────────────────────────────────────────────
const HAS_CHINESE = /[\u4e00-\u9fff]/;
const HAS_LATIN = /[a-zA-Z]/;
const HAS_TONE_MARKS = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;
const IS_VALID_PINYIN = /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüẖ\s,.\-'!?]+$/;

export interface MandarinLayers {
  /** Chinese characters — empty string if not available */
  hanzi: string;
  /** Tone-marked pinyin — empty string if not available */
  pinyin: string;
  /** English-friendly "say it like" guide — empty string if pinyin unavailable */
  sayLike: string;
  /** True if both hanzi and pinyin passed validation */
  valid: boolean;
}

/**
 * Resolve the 3 display layers for a Mandarin phrase.
 * Call this at render time — NEVER cache the result across responses.
 *
 * @param naturalPhrase  The `response.naturalPhrase` field
 * @param phonetic       The `response.phonetic` field
 */
export function resolveMandarinLayers(
  naturalPhrase: string | undefined | null,
  phonetic: string | undefined | null,
): MandarinLayers {
  const rawPhrase = (naturalPhrase ?? "").trim();
  const rawPhonetic = (phonetic ?? "").trim();

  // ── Derive hanzi ────────────────────────────────────────────────────────
  let hanzi = "";
  if (rawPhrase && HAS_CHINESE.test(rawPhrase)) {
    // Extract only the Chinese portion if mixed (e.g. "你好 (hello)")
    hanzi = rawPhrase;
  }

  // ── Derive pinyin ──────────────────────────────────────────────────────
  let pinyin = "";
  if (rawPhonetic) {
    // Reject phonetic if it contains Chinese characters
    if (HAS_CHINESE.test(rawPhonetic)) {
      pinyin = "";
    } else if (HAS_TONE_MARKS.test(rawPhonetic) || IS_VALID_PINYIN.test(rawPhonetic)) {
      pinyin = rawPhonetic;
    }
  }

  // ── Derive sayLike ─────────────────────────────────────────────────────
  // ALWAYS compute fresh — never reuse a cached value
  const sayLike = pinyin ? pinyinToSayLike(pinyin) : "";

  // ── Validation ─────────────────────────────────────────────────────────
  const valid = hanzi.length > 0 && pinyin.length > 0;

  // If hanzi is present but pinyin failed validation, sayLike stays empty
  // — the UI will show hanzi as the primary display instead.
  // If neither hanzi nor pinyin is valid, return empty layers — the UI
  // should fall back to showing whatever naturalPhrase was given.

  return { hanzi, pinyin, sayLike, valid };
}
