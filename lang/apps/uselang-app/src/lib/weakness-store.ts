// ── Weakness Store ───────────────────────────────────────────────────────────
// Persistent tracking of user weaknesses across sessions. Stores error types,
// phrases that caused failures, and frequency counts. Used by the tutor engine
// to auto-bias future prompts toward fixing the student's weak spots.

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ────────────────────────────────────────────────────────────────────

export type ErrorCategory =
  | "grammar"
  | "pronunciation"
  | "tone"
  | "word-choice"
  | "structure";

export interface WeaknessEntry {
  category: ErrorCategory;
  phrase: string;
  detail: string;
  count: number;
  lastSeen: number;
}

interface WeaknessData {
  entries: WeaknessEntry[];
  toneConfusion: string[];
  grammarPatterns: string[];
  vocabFailures: string[];
}

// ── Storage keys ─────────────────────────────────────────────────────────────

const STORE_KEY = (lang: string) => `@weakness_${lang}`;

async function readStore(langCode: string): Promise<WeaknessData> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY(langCode));
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt → start fresh */ }
  return { entries: [], toneConfusion: [], grammarPatterns: [], vocabFailures: [] };
}

async function writeStore(langCode: string, data: WeaknessData): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY(langCode), JSON.stringify(data));
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function recordWeakness(
  langCode: string,
  category: ErrorCategory,
  phrase: string,
  detail: string,
): Promise<void> {
  const data = await readStore(langCode);

  // Find existing entry for same phrase + category
  const existing = data.entries.find(
    (e) => e.category === category && e.phrase === phrase,
  );

  if (existing) {
    existing.count += 1;
    existing.detail = detail;
    existing.lastSeen = Date.now();
  } else {
    data.entries.push({
      category,
      phrase,
      detail,
      count: 1,
      lastSeen: Date.now(),
    });
  }

  // Track category-specific patterns
  if (category === "tone" && detail && !data.toneConfusion.includes(detail)) {
    data.toneConfusion = [...data.toneConfusion, detail].slice(-20);
  }
  if (category === "grammar" && detail && !data.grammarPatterns.includes(detail)) {
    data.grammarPatterns = [...data.grammarPatterns, detail].slice(-20);
  }
  if (category === "word-choice" && phrase && !data.vocabFailures.includes(phrase)) {
    data.vocabFailures = [...data.vocabFailures, phrase].slice(-30);
  }

  // Cap total entries at 100, keep most recent/frequent
  if (data.entries.length > 100) {
    data.entries.sort((a, b) => b.count * 100 + b.lastSeen - (a.count * 100 + a.lastSeen));
    data.entries = data.entries.slice(0, 100);
  }

  await writeStore(langCode, data);
}

export async function getTopWeaknesses(
  langCode: string,
  limit: number = 5,
): Promise<WeaknessEntry[]> {
  const data = await readStore(langCode);
  return data.entries
    .sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen)
    .slice(0, limit);
}

export async function getWeaknessesByCategory(
  langCode: string,
  category: ErrorCategory,
): Promise<WeaknessEntry[]> {
  const data = await readStore(langCode);
  return data.entries
    .filter((e) => e.category === category)
    .sort((a, b) => b.count - a.count);
}

export async function getToneConfusions(langCode: string): Promise<string[]> {
  const data = await readStore(langCode);
  return data.toneConfusion;
}

export async function getGrammarPatterns(langCode: string): Promise<string[]> {
  const data = await readStore(langCode);
  return data.grammarPatterns;
}

export async function getVocabFailures(langCode: string): Promise<string[]> {
  const data = await readStore(langCode);
  return data.vocabFailures;
}

export async function getAllWeaknesses(langCode: string): Promise<WeaknessData> {
  return readStore(langCode);
}

export async function clearWeaknesses(langCode: string): Promise<void> {
  await AsyncStorage.removeItem(STORE_KEY(langCode));
}

export async function getWeaknessSummary(
  langCode: string,
): Promise<{ total: number; byCategory: Record<ErrorCategory, number> }> {
  const data = await readStore(langCode);
  const byCategory: Record<ErrorCategory, number> = {
    grammar: 0,
    pronunciation: 0,
    tone: 0,
    "word-choice": 0,
    structure: 0,
  };
  for (const e of data.entries) {
    byCategory[e.category] += e.count;
  }
  return { total: data.entries.length, byCategory };
}
