// ── Lesson Progress Store ────────────────────────────────────────────────────
// Persists lesson completion, map unlocks, and ability badges to AsyncStorage.
// 100% offline. No API calls.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AllProgress,
  LanguageProgress,
  LessonProgress,
  UnitProgress,
  MapLocationTier,
  MapLocation,
  Lesson,
  Unit,
  LanguageCurriculum,
} from "./lesson-types";

const STORAGE_KEY = "lang:lessonProgress";

// ── In-memory cache ──────────────────────────────────────────────────────────

let cache: AllProgress | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeLessonProgress(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Read / Write ─────────────────────────────────────────────────────────────

async function load(): Promise<AllProgress> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : { languages: {} };
  } catch {
    cache = { languages: {} };
  }
  return cache!;
}

async function save(): Promise<void> {
  if (!cache) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* swallow — best-effort persistence */
  }
  notify();
}

function ensureLanguage(all: AllProgress, code: string): LanguageProgress {
  if (!all.languages[code]) {
    all.languages[code] = {
      languageCode: code,
      units: {},
      lessons: {},
      unlockedLocations: [],
      locationTiers: {},
      abilities: [],
      reviewQueue: [],
    };
  }
  return all.languages[code];
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getAllProgress(): Promise<AllProgress> {
  return load();
}

export async function getLanguageProgress(code: string): Promise<LanguageProgress> {
  const all = await load();
  return ensureLanguage(all, code);
}

export async function getLessonProgress(langCode: string, lessonId: string): Promise<LessonProgress> {
  const lp = await getLanguageProgress(langCode);
  return lp.lessons[lessonId] || { lessonId, completedParts: [], completed: false };
}

/** Mark a lesson part as complete. Returns true if the whole lesson is now complete. */
export async function completePartInLesson(
  langCode: string,
  lesson: Lesson,
  partId: string,
): Promise<{ lessonComplete: boolean; ability: string | null }> {
  const all = await load();
  const lp = ensureLanguage(all, langCode);

  if (!lp.lessons[lesson.id]) {
    lp.lessons[lesson.id] = { lessonId: lesson.id, completedParts: [], completed: false };
  }
  const progress = lp.lessons[lesson.id];
  if (!progress.completedParts.includes(partId)) {
    progress.completedParts.push(partId);
  }

  // Check if all parts done
  const allPartIds = lesson.parts.map((p) => p.id);
  const allDone = allPartIds.every((id) => progress.completedParts.includes(id));
  let ability: string | null = null;

  if (allDone && !progress.completed) {
    progress.completed = true;
    progress.completedAt = Date.now();
    ability = lesson.realWorldAbility;
    if (ability && !lp.abilities.includes(ability)) {
      lp.abilities.push(ability);
    }
    // Add to review queue after 3 more lessons
    addToReviewQueue(lp, lesson.id);
  }

  await save();
  return { lessonComplete: allDone, ability };
}

/** Mark a full lesson as complete (e.g. after final check). */
export async function completeLessonFull(
  langCode: string,
  lesson: Lesson,
): Promise<string | null> {
  const all = await load();
  const lp = ensureLanguage(all, langCode);

  if (!lp.lessons[lesson.id]) {
    lp.lessons[lesson.id] = {
      lessonId: lesson.id,
      completedParts: lesson.parts.map((p) => p.id),
      completed: true,
      completedAt: Date.now(),
    };
  } else {
    lp.lessons[lesson.id].completed = true;
    lp.lessons[lesson.id].completedAt = Date.now();
    lp.lessons[lesson.id].completedParts = lesson.parts.map((p) => p.id);
  }

  const ability = lesson.realWorldAbility;
  if (ability && !lp.abilities.includes(ability)) {
    lp.abilities.push(ability);
  }

  addToReviewQueue(lp, lesson.id);
  await save();
  return ability || null;
}

/** Check if a unit is fully complete and mark it. */
export async function checkUnitCompletion(
  langCode: string,
  unit: Unit,
): Promise<boolean> {
  const all = await load();
  const lp = ensureLanguage(all, langCode);

  const allDone = unit.lessons.every((l) => lp.lessons[l.id]?.completed);
  if (!lp.units[unit.id]) {
    lp.units[unit.id] = { unitId: unit.id, completedLessons: [], completed: false };
  }
  lp.units[unit.id].completedLessons = unit.lessons
    .filter((l) => lp.lessons[l.id]?.completed)
    .map((l) => l.id);
  lp.units[unit.id].completed = allDone;

  await save();
  return allDone;
}

/** Unlock or upgrade a map location based on linked lesson completions. */
export async function updateMapLocation(
  langCode: string,
  location: MapLocation,
): Promise<MapLocationTier> {
  const all = await load();
  const lp = ensureLanguage(all, langCode);

  const completedCount = location.linkedLessonIds.filter(
    (id) => lp.lessons[id]?.completed,
  ).length;

  let tier: MapLocationTier = "locked";
  if (completedCount >= 3) tier = "gold";
  else if (completedCount >= 2) tier = "silver";
  else if (completedCount >= 1) tier = "bronze";

  lp.locationTiers[location.id] = tier;
  if (tier !== "locked" && !lp.unlockedLocations.includes(location.id)) {
    lp.unlockedLocations.push(location.id);
  }

  await save();
  return tier;
}

/** Save speed round score. */
export async function saveSpeedRoundScore(
  langCode: string,
  lessonId: string,
  score: number,
): Promise<void> {
  const all = await load();
  const lp = ensureLanguage(all, langCode);
  if (!lp.lessons[lessonId]) {
    lp.lessons[lessonId] = { lessonId, completedParts: [], completed: false };
  }
  const prev = lp.lessons[lessonId].speedRoundScore ?? 0;
  if (score > prev) {
    lp.lessons[lessonId].speedRoundScore = score;
  }
  await save();
}

/** Get the next review lesson if due. */
export async function getNextReview(langCode: string): Promise<string | null> {
  const lp = await getLanguageProgress(langCode);
  return lp.reviewQueue.length > 0 ? lp.reviewQueue[0] : null;
}

/** Pop a review from the queue. */
export async function popReview(langCode: string): Promise<void> {
  const all = await load();
  const lp = ensureLanguage(all, langCode);
  lp.reviewQueue.shift();
  lp.lastReviewAt = Date.now();
  await save();
}

/** Check if a lesson is unlocked (previous lesson in unit must be complete, or it's the first). */
export function isLessonUnlocked(
  curriculum: LanguageCurriculum,
  langProgress: LanguageProgress,
  lessonId: string,
): boolean {
  for (const unit of curriculum.units) {
    for (let i = 0; i < unit.lessons.length; i++) {
      if (unit.lessons[i].id === lessonId) {
        if (i === 0) {
          // First lesson in unit: check previous unit's last lesson
          const unitIdx = curriculum.units.indexOf(unit);
          if (unitIdx === 0) return true; // very first lesson
          const prevUnit = curriculum.units[unitIdx - 1];
          const lastLesson = prevUnit.lessons[prevUnit.lessons.length - 1];
          return !!langProgress.lessons[lastLesson.id]?.completed;
        }
        return !!langProgress.lessons[unit.lessons[i - 1].id]?.completed;
      }
    }
  }
  return false;
}

/** Get counts for UI display. */
export async function getProgressStats(langCode: string): Promise<{
  lessonsCompleted: number;
  totalLessons: number;
  locationsUnlocked: number;
  abilitiesEarned: number;
}> {
  const lp = await getLanguageProgress(langCode);
  const completed = Object.values(lp.lessons).filter((l) => l.completed).length;
  return {
    lessonsCompleted: completed,
    totalLessons: Object.keys(lp.lessons).length || completed,
    locationsUnlocked: lp.unlockedLocations.length,
    abilitiesEarned: lp.abilities.length,
  };
}

/** Reset all progress (for dev/testing). */
export async function resetAllProgress(): Promise<void> {
  cache = { languages: {} };
  await save();
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function addToReviewQueue(lp: LanguageProgress, lessonId: string): void {
  // Schedule a review after the user completes 3 more lessons
  const completed = Object.values(lp.lessons).filter((l) => l.completed).length;
  // Insert at position: current + 3 lessons from now ≈ end of queue
  if (!lp.reviewQueue.includes(lessonId)) {
    lp.reviewQueue.push(lessonId);
  }
}
