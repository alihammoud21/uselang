// ── Input validation ────────────────────────────────────────────────────────
// Validates and sanitizes user text before it reaches Gemma or any AI call.
// Non-Latin scripts (CJK, Arabic, Cyrillic, etc.) are explicitly preserved.

const MAX_LENGTH = 600;

export interface ValidateResult {
  ok: boolean;
  clean: string;
  reason?: string;
}

export function validateUserText(raw: string | undefined | null): ValidateResult {
  if (raw == null) return { ok: false, clean: "", reason: "Type something first." };

  // Strip control chars (keep newlines + tabs for now)
  let s = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Normalize whitespace
  s = s.replace(/\s+/g, " ").trim();

  if (!s) return { ok: false, clean: "", reason: "Type something first." };

  // Truncate (don't reject — just cap silently)
  if (s.length > MAX_LENGTH) {
    s = s.slice(0, MAX_LENGTH);
  }

  return { ok: true, clean: s };
}

/**
 * Normalize a string for answer comparison in lessons.
 * Strips accents, punctuation, extra spaces; lowercases.
 */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip combining diacriticals
    .replace(/[.,!?;:¡¿"'"""''…—–\-()[\]{}]/g, "")  // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}
