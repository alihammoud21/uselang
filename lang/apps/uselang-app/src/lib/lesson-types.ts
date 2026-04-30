// ── Lesson System Types ──────────────────────────────────────────────────────
// All types for the structured, offline-first lesson + map progression system.

// ── Exercise Types ───────────────────────────────────────────────────────────

export type ExerciseType =
  | "vocab-card"        // show word + translation + audio hint
  | "multiple-choice"   // pick the correct option
  | "translate"         // type a translation
  | "fill-blank"        // sentence with a blank
  | "match-pairs"       // match L1↔L2 pairs
  | "reorder"           // reorder words into correct sentence
  | "listen-type"       // hear a phrase, type what you heard
  | "scenario"          // real-life situation with choices
  | "build-sentence"    // drag-and-drop word bank → correct sentence
  | "speed-round";      // rapid-fire timed questions

export interface VocabCardExercise {
  type: "vocab-card";
  word: string;
  pinyin?: string;         // Mandarin-specific romanisation
  romanization?: string;   // generic romanisation for other languages
  translation: string;
  example?: string;
  exampleTranslation?: string;
  audio?: string;          // reserved for future on-device audio refs
  tip?: string;            // micro-explanation
}

export interface MultipleChoiceExercise {
  type: "multiple-choice";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TranslateExercise {
  type: "translate";
  prompt: string;
  promptLang: "target" | "native";
  acceptedAnswers: string[];
  explanation: string;
}

export interface FillBlankExercise {
  type: "fill-blank";
  sentence: string;        // use ___ for the blank
  answer: string;
  options?: string[];       // optional word bank
  explanation: string;
}

export interface MatchPairsExercise {
  type: "match-pairs";
  pairs: { left: string; right: string }[];
}

export interface ReorderExercise {
  type: "reorder";
  words: string[];
  correctOrder: string[];
  translation: string;
  explanation: string;
}

export interface ListenTypeExercise {
  type: "listen-type";
  phrase: string;
  pinyin?: string;
  translation: string;
  acceptedAnswers: string[];
}

export interface ScenarioExercise {
  type: "scenario";
  situation: string;
  npcLine: string;
  npcLinePinyin?: string;
  npcLineTranslation?: string;
  options: { text: string; correct: boolean; feedback: string }[];
}

export interface BuildSentenceExercise {
  type: "build-sentence";
  translation: string;
  wordBank: string[];
  correctOrder: string[];
  explanation: string;
}

export interface SpeedRoundExercise {
  type: "speed-round";
  questions: {
    prompt: string;
    answer: string;
    acceptedAnswers?: string[];
  }[];
  timeLimitSeconds: number;
}

export type Exercise =
  | VocabCardExercise
  | MultipleChoiceExercise
  | TranslateExercise
  | FillBlankExercise
  | MatchPairsExercise
  | ReorderExercise
  | ListenTypeExercise
  | ScenarioExercise
  | BuildSentenceExercise
  | SpeedRoundExercise;

// ── Part / Lesson / Unit / Curriculum ────────────────────────────────────────

export interface LessonPart {
  id: string;
  title: string;
  description: string;
  exercises: Exercise[];
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  /** The real-world ability this lesson unlocks. */
  realWorldAbility: string;
  /** Map location ID that unlocks on completion. */
  mapLocationId?: string;
  parts: LessonPart[];
  /** Speed round at the end of the lesson (optional). */
  speedRound?: SpeedRoundExercise;
  /** Final check exercises before completion (optional). */
  finalCheck?: Exercise[];
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface LanguageCurriculum {
  languageCode: string;
  languageLabel: string;
  units: Unit[];
}

// ── Map Location ─────────────────────────────────────────────────────────────

export type MapLocationTier = "locked" | "bronze" | "silver" | "gold";

export interface MapLocation {
  id: string;
  /** Display name (e.g. "Café in Beijing"). */
  name: string;
  /** Country or city label. */
  country: string;
  /** Location type icon hint. */
  locationType: "cafe" | "airport" | "store" | "hotel" | "street" | "restaurant" | "station" | "market" | "school" | "hospital";
  lat: number;
  lng: number;
  /** Which language curriculum this belongs to. */
  languageCode: string;
  /** Lesson IDs that contribute to tiering:
   *  - 1 lesson complete → bronze
   *  - 2 lessons complete → silver
   *  - 3+ lessons complete → gold */
  linkedLessonIds: string[];
}

// ── Progress / State ─────────────────────────────────────────────────────────

export interface LessonProgress {
  lessonId: string;
  completedParts: string[];      // part IDs
  completed: boolean;
  completedAt?: number;          // timestamp
  /** Speed round best score (0-100). */
  speedRoundScore?: number;
}

export interface UnitProgress {
  unitId: string;
  completedLessons: string[];
  completed: boolean;
}

export interface LanguageProgress {
  languageCode: string;
  units: Record<string, UnitProgress>;
  lessons: Record<string, LessonProgress>;
  unlockedLocations: string[];   // MapLocation IDs
  locationTiers: Record<string, MapLocationTier>;
  /** Ability labels the user has earned. */
  abilities: string[];
  /** Review queue: lesson IDs that should be revisited. */
  reviewQueue: string[];
  lastReviewAt?: number;
}

export interface AllProgress {
  languages: Record<string, LanguageProgress>;
}

// ── "Can You Survive?" Mode ──────────────────────────────────────────────────

export interface SurvivalScenario {
  id: string;
  title: string;
  description: string;
  /** Required lesson IDs to unlock this scenario. */
  requiredLessonIds: string[];
  languageCode: string;
  steps: SurvivalStep[];
}

export interface SurvivalStep {
  situation: string;
  npcLine: string;
  npcLinePinyin?: string;
  npcLineTranslation?: string;
  options: { text: string; correct: boolean; feedback: string }[];
}
