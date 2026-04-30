// ── Goal catalog ─────────────────────────────────────────────────────────────
// The ten preset goals + Custom that the onboarding flow offers. One source
// of truth so onboarding, curriculum, and tutor prompts stay aligned.
//
// Each preset has:
//   - id: short slug stored on the profile (profile.goalPreset)
//   - label: short display name
//   - hint: one-line description shown under the label
//   - icon: Ionicons glyph
//   - scenarioText: the free-text string written to profile.scenario. This is
//     what the tutor prompt and the curriculum keyword picker both read, so
//     the wording here should include keywords that match a curriculum track.

import type React from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { GoalPreset } from "./user-store";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export interface GoalOption {
  id: Exclude<GoalPreset, "">;
  label: string;
  hint: string;
  icon: IoniconName;
  scenarioText: string;
  tutorNote: string; // one extra line appended to the tutor's system context
}

export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: "travel",
    label: "Travel",
    hint: "Cafés, directions, taxis, hotels — ground-level travel talk",
    icon: "airplane",
    scenarioText: "traveling abroad and using the language day-to-day on trips",
    tutorNote: "Lean into travel contexts: cafés, taxis, ordering, asking locals.",
  },
  {
    id: "school",
    label: "School",
    hint: "What you actually say in class — answers, questions, group work",
    icon: "school",
    scenarioText: "speaking the language in a school or university setting",
    tutorNote: "Lean into classroom moments: questions, answers, group work, presentations.",
  },
  {
    id: "family",
    label: "Speak with family",
    hint: "Phrases that come up with relatives — warm and everyday",
    icon: "people",
    scenarioText: "speaking with family members who use this language at home",
    tutorNote: "Lean into family moments: meals, greetings, phone calls, terms of endearment.",
  },
  {
    id: "relocate",
    label: "Move to another country",
    hint: "Life abroad — housing, banking, bureaucracy, neighbors",
    icon: "briefcase",
    scenarioText: "moving to live in a country where this language is the daily tongue (travel + everyday life)",
    tutorNote: "Cover real relocation needs: apartments, banking, phone contracts, meeting neighbors.",
  },
  {
    id: "business",
    label: "Business",
    hint: "Meetings, intros, calls — be taken seriously",
    icon: "briefcase-outline",
    scenarioText: "speaking the language in business and professional settings",
    tutorNote: "Stay professional. Meetings, introductions, updates, polite negotiation.",
  },
  {
    id: "friends",
    label: "Make friends",
    hint: "Break the ice, keep conversations going, make plans",
    icon: "beer",
    scenarioText: "making and keeping friends who speak this language",
    tutorNote: "Keep it social: openers, small talk, inside jokes, plans for later.",
  },
  {
    id: "pronunciation",
    label: "Pronunciation",
    hint: "Target the sounds that give learners the most trouble",
    icon: "musical-notes",
    scenarioText: "polishing my pronunciation, accent, and the sounds learners usually get wrong",
    tutorNote: "Focus every turn on one specific sound. Always give mouth + tongue placement.",
  },
  {
    id: "test",
    label: "Pass a test",
    hint: "DELF / JLPT / HSK / TOEFL — exam-ready phrasing",
    icon: "document-text",
    scenarioText: "preparing for a language proficiency test or certification exam",
    tutorNote: "Simulate exam-style prompts. Keep answers formal, full-sentence, correctable.",
  },
  {
    id: "shows",
    label: "Watch shows without subtitles",
    hint: "Real-world listening — idioms, slang, connected speech",
    icon: "tv",
    scenarioText: "understanding native shows, movies, and music without subtitles",
    tutorNote: "Feed the user colloquial phrases from shows/movies. Explain idioms and slang.",
  },
  {
    id: "custom",
    label: "Something else",
    hint: "Type your own goal — the tutor will tailor every lesson to it",
    icon: "create",
    scenarioText: "", // filled in from the user's typed text
    tutorNote: "", // filled in dynamically from the user's typed text
  },
];

// Find an option by id (including the Custom sentinel).
export function findGoalOption(
  id: GoalPreset
): GoalOption | undefined {
  if (!id) return undefined;
  return GOAL_OPTIONS.find((g) => g.id === id);
}

// Short display label for the Plan tab header / Today card / Settings row.
export function goalLabelFor(profile: {
  goalPreset: GoalPreset;
  scenario: string;
}): string {
  if (profile.goalPreset === "custom") {
    return profile.scenario.trim() || "Custom goal";
  }
  const preset = findGoalOption(profile.goalPreset);
  return preset?.label || "Everyday conversation";
}
