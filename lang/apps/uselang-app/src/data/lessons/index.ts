// ── Lesson Curriculum Index ───────────────────────────────────────────────────

import type { LanguageCurriculum } from "@/lib/lesson-types";
import { MANDARIN_CURRICULUM } from "./zh";
import { SPANISH_CURRICULUM } from "./es";
import { FRENCH_CURRICULUM } from "./fr";

const CURRICULA: Record<string, LanguageCurriculum> = {
  zh: MANDARIN_CURRICULUM,
  es: SPANISH_CURRICULUM,
  fr: FRENCH_CURRICULUM,
};

export function getCurriculum(languageCode: string): LanguageCurriculum | null {
  return CURRICULA[languageCode] || CURRICULA[languageCode.split("-")[0]] || null;
}

export function hasCurriculum(languageCode: string): boolean {
  return !!getCurriculum(languageCode);
}

export function getAllCurriculumCodes(): string[] {
  return Object.keys(CURRICULA);
}

export { MANDARIN_CURRICULUM, SPANISH_CURRICULUM, FRENCH_CURRICULUM };
