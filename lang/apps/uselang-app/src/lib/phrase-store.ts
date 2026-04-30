// ── Saved phrases store ──────────────────────────────────────────────────────
// Works fully offline. Cap at a sensible number to protect storage.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "lang:savedPhrases";
const MAX_PHRASES = 500;

export interface SavedPhrase {
  id: string;
  languageCode: string;
  phrase: string;
  phonetic: string;
  meaning: string;
  tip: string;
  // AI voice (what the tutor said)
  audioBase64?: string;
  audioMimeType?: string;
  // User voice (their attempt — stored as local file URI)
  userAudioUri?: string;
  // Articulation for the library tongue diagram
  tonguePlacement?: string;
  lipShape?: string;
  phoneme?: string;
  createdAt: number;
}

async function readAll(): Promise<SavedPhrase[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listSavedPhrases(languageCode?: string): Promise<SavedPhrase[]> {
  const all = await readAll();
  return languageCode ? all.filter((p) => p.languageCode === languageCode) : all;
}

export async function savePhrase(input: Omit<SavedPhrase, "id" | "createdAt">): Promise<SavedPhrase> {
  const all = await readAll();
  const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const next: SavedPhrase = { ...input, id, createdAt: Date.now() };
  const deduped = [next, ...all.filter((p) => p.phrase !== input.phrase || p.languageCode !== input.languageCode)];
  await AsyncStorage.setItem(KEY, JSON.stringify(deduped.slice(0, MAX_PHRASES)));
  return next;
}

export async function deletePhrase(id: string): Promise<void> {
  const all = await readAll();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter((p) => p.id !== id)));
}

export async function countSavedPhrases(): Promise<number> {
  return (await readAll()).length;
}
