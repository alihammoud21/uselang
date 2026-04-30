// ── Curriculum — goal-shaped lesson plan ─────────────────────────────────────
// The onboarding flow already asks the user *why* they're learning (stored as
// `profile.scenario`). This file takes that free-text goal and returns an
// ordered list of upcoming lessons. Today Plan tab uses it to show what's
// next; the tutor uses the lesson title as the "scenario" for its opening
// turn so the conversation stays on-theme.
//
// Each curriculum is a short, teachable arc (8 lessons). Locked/unlocked is
// derived from the user's turn count so the plan gradually unlocks as they
// practice.

export interface PlannedLesson {
  id: string;
  title: string;
  focus: string;        // speaking focus blurb, shown under the title
  estMinutes: number;
  scenario: string;     // what we pass to the tutor as the lesson theme
}

export interface Curriculum {
  id: string;
  label: string;        // human label like "Travel" or "Family"
  subtitle: string;     // one-line description shown under the header
  lessons: PlannedLesson[];
}

// ─── Templates ──────────────────────────────────────────────────────────────

const TRAVEL: Curriculum = {
  id: "travel",
  label: "Travel",
  subtitle: "Speak confidently on the ground — cafés, directions, taxis, hotels.",
  lessons: [
    { id: "t1", title: "Greetings at a café",          focus: "Polite ordering + thank-yous",          estMinutes: 4, scenario: "ordering at a café" },
    { id: "t2", title: "Ordering food",                focus: "Menu vocab + modifications",            estMinutes: 5, scenario: "ordering food at a restaurant" },
    { id: "t3", title: "Asking for directions",        focus: "Left / right / near / far",             estMinutes: 5, scenario: "asking for directions on the street" },
    { id: "t4", title: "Buying train tickets",         focus: "Numbers + times + destinations",        estMinutes: 6, scenario: "buying a train ticket" },
    { id: "t5", title: "Checking into a hotel",        focus: "Reservations + check-in phrases",       estMinutes: 5, scenario: "checking into a hotel" },
    { id: "t6", title: "Emergency phrases",            focus: "Help / doctor / pharmacy",              estMinutes: 4, scenario: "emergency phrases while traveling" },
    { id: "t7", title: "Small talk with locals",       focus: "Where are you from / how long",         estMinutes: 5, scenario: "making small talk with locals" },
    { id: "t8", title: "Full travel conversation",     focus: "Stacked moves: cafe → taxi → hotel",    estMinutes: 8, scenario: "a full day traveling abroad" },
  ],
};

const FAMILY: Curriculum = {
  id: "family",
  label: "Speak with family",
  subtitle: "Phrases that actually come up with relatives — warm and everyday.",
  lessons: [
    { id: "f1", title: "Warm greetings",               focus: "Hellos, how are you, I missed you",    estMinutes: 4, scenario: "greeting a family member you haven't seen" },
    { id: "f2", title: "Talking about your day",       focus: "Simple past + feelings",                estMinutes: 5, scenario: "telling family about your day" },
    { id: "f3", title: "At the kitchen table",         focus: "Food names + asking politely",          estMinutes: 5, scenario: "eating a meal with family" },
    { id: "f4", title: "Asking about their day",       focus: "Questions that show you care",          estMinutes: 4, scenario: "asking a family member how they are" },
    { id: "f5", title: "Sharing news",                 focus: "Good news + bad news phrases",          estMinutes: 5, scenario: "sharing personal news with family" },
    { id: "f6", title: "Showing affection",            focus: "Terms of endearment that feel natural", estMinutes: 4, scenario: "expressing affection to a relative" },
    { id: "f7", title: "On the phone",                 focus: "Opening, listening, signing off",       estMinutes: 5, scenario: "calling a family member on the phone" },
    { id: "f8", title: "A full family dinner",         focus: "Stacked moves across a meal",           estMinutes: 7, scenario: "having dinner with the whole family" },
  ],
};

const SCHOOL: Curriculum = {
  id: "school",
  label: "School",
  subtitle: "What you actually say in class — answers, questions, group work.",
  lessons: [
    { id: "s1", title: "Classroom greetings",          focus: "Teacher / peers / attendance",          estMinutes: 4, scenario: "greeting a teacher and classmates" },
    { id: "s2", title: "Asking a question",            focus: "Polite interruption phrases",           estMinutes: 5, scenario: "asking a question during a lesson" },
    { id: "s3", title: "Answering the teacher",        focus: "Short answers with confidence",         estMinutes: 5, scenario: "answering a teacher's question" },
    { id: "s4", title: "Group project talk",           focus: "Suggesting / agreeing / disagreeing",   estMinutes: 6, scenario: "working on a school project with classmates" },
    { id: "s5", title: "Presenting aloud",             focus: "Opening line + transitions",            estMinutes: 6, scenario: "presenting in front of the class" },
    { id: "s6", title: "Talking to a teacher",         focus: "Office hours / clarifying",             estMinutes: 5, scenario: "talking to a teacher one-on-one" },
    { id: "s7", title: "Social moments at school",     focus: "Lunch / after class / weekends",        estMinutes: 5, scenario: "chatting with classmates after school" },
    { id: "s8", title: "Test day vocabulary",          focus: "Requesting / timing / permission",      estMinutes: 5, scenario: "everyday moments on a test day" },
  ],
};

const BUSINESS: Curriculum = {
  id: "business",
  label: "Business",
  subtitle: "Be taken seriously — emails, meetings, calls, introductions.",
  lessons: [
    { id: "b1", title: "Professional introductions",   focus: "Title + role + handshake phrases",      estMinutes: 4, scenario: "introducing yourself in a business meeting" },
    { id: "b2", title: "Starting a meeting",           focus: "Agenda + setting expectations",         estMinutes: 5, scenario: "opening a business meeting" },
    { id: "b3", title: "Giving your update",           focus: "Status + blockers + asks",              estMinutes: 5, scenario: "giving a short status update at work" },
    { id: "b4", title: "Asking for clarification",     focus: "Polite pushback + confirmation",        estMinutes: 5, scenario: "asking for clarification on a business decision" },
    { id: "b5", title: "Business lunch talk",          focus: "Small talk with clients",               estMinutes: 6, scenario: "having lunch with a business client" },
    { id: "b6", title: "Phone / conference calls",     focus: "Opening / turn-taking / wrap-up",       estMinutes: 6, scenario: "speaking on a conference call" },
    { id: "b7", title: "Negotiating politely",         focus: "Soft language for hard asks",           estMinutes: 6, scenario: "negotiating terms in a business context" },
    { id: "b8", title: "Closing the deal",             focus: "Thanks + next steps",                   estMinutes: 5, scenario: "wrapping up a business deal" },
  ],
};

const PRONUNCIATION: Curriculum = {
  id: "pronunciation",
  label: "Pronunciation focus",
  subtitle: "Targeted practice on the sounds learners stumble on most.",
  lessons: [
    { id: "p1", title: "Vowels you know but don't",   focus: "Why your native vowels betray you",     estMinutes: 5, scenario: "practicing target-language vowel sounds" },
    { id: "p2", title: "Rolling vs tapping",           focus: "r-sound variants across languages",     estMinutes: 5, scenario: "practicing the target language's r sound" },
    { id: "p3", title: "Nasals & throat sounds",       focus: "Breath control for non-native nasals",  estMinutes: 5, scenario: "practicing nasal and throat sounds" },
    { id: "p4", title: "Stress & rhythm",              focus: "Which syllable does the work",          estMinutes: 5, scenario: "practicing stress patterns in words" },
    { id: "p5", title: "Minimal pairs",                focus: "Words that differ by one sound",        estMinutes: 5, scenario: "distinguishing minimal pair words" },
    { id: "p6", title: "Linking & flow",               focus: "How native speakers smush words",       estMinutes: 6, scenario: "linking words together naturally" },
    { id: "p7", title: "Intonation basics",            focus: "Questions vs statements vs emotion",    estMinutes: 5, scenario: "using intonation to convey meaning" },
    { id: "p8", title: "Full passage reading",         focus: "Everything above, in one paragraph",    estMinutes: 7, scenario: "reading a natural paragraph aloud" },
  ],
};

const FRIENDS: Curriculum = {
  id: "friends",
  label: "Make friends",
  subtitle: "Break the ice, keep the conversation going, make plans.",
  lessons: [
    { id: "fr1", title: "Introducing yourself",        focus: "Name + where you're from + why here",   estMinutes: 4, scenario: "introducing yourself at a social event" },
    { id: "fr2", title: "Breaking the ice",            focus: "Openers that don't feel scripted",      estMinutes: 5, scenario: "starting a conversation with a new person" },
    { id: "fr3", title: "Finding common ground",       focus: "Hobbies / work / music",                estMinutes: 5, scenario: "discovering shared interests" },
    { id: "fr4", title: "Following up",                focus: "Asking genuine questions",              estMinutes: 5, scenario: "asking good follow-up questions" },
    { id: "fr5", title: "Making plans",                focus: "Suggesting / agreeing / rescheduling",  estMinutes: 5, scenario: "making plans to meet up" },
    { id: "fr6", title: "Reacting to stories",         focus: "That's crazy / no way / really?",       estMinutes: 4, scenario: "reacting to a friend's story" },
    { id: "fr7", title: "Being funny safely",          focus: "Light teasing / self-deprecation",      estMinutes: 5, scenario: "being playful with new friends" },
    { id: "fr8", title: "A night out together",        focus: "Stacked: greeting → dinner → goodbye",  estMinutes: 7, scenario: "spending an evening with friends" },
  ],
};

const EVERYDAY: Curriculum = {
  id: "everyday",
  label: "Everyday conversation",
  subtitle: "The stuff you actually need — week one through year one.",
  lessons: [
    { id: "e1", title: "Meeting someone new",          focus: "Greeting + basic intro exchange",       estMinutes: 4, scenario: "meeting someone new" },
    { id: "e2", title: "Numbers & times",              focus: "Prices, hours, minutes, dates",         estMinutes: 5, scenario: "talking about numbers and times" },
    { id: "e3", title: "In a shop",                    focus: "Asking, paying, thanking",              estMinutes: 5, scenario: "shopping at a local store" },
    { id: "e4", title: "Asking how to say things",     focus: "Meta-phrases for learners",             estMinutes: 4, scenario: "asking how to say things in the target language" },
    { id: "e5", title: "Talking about your day",       focus: "Past tense + feelings",                 estMinutes: 5, scenario: "describing your day" },
    { id: "e6", title: "Weather & weekend",            focus: "Small-talk defaults",                   estMinutes: 4, scenario: "small talk about weather and weekends" },
    { id: "e7", title: "Asking for help",              focus: "Polite requests + emergencies",         estMinutes: 5, scenario: "asking a stranger for help" },
    { id: "e8", title: "Telling your story",           focus: "Longer connected speech",               estMinutes: 7, scenario: "telling your story in the target language" },
  ],
};

// ─── Picker ─────────────────────────────────────────────────────────────────

export function pickCurriculumForScenario(rawScenario: string): Curriculum {
  const s = (rawScenario || "").toLowerCase();
  if (/(travel|trip|vacation|tourist|abroad|visit|france|japan|spain|italy|cafe|relocate|move to|immigran|emigrat)/.test(s)) return TRAVEL;
  if (/(grandpa|grandma|abuela|family|relative|mom|dad|parent)/.test(s))                    return FAMILY;
  if (/(school|class|college|university|student|teacher|exam|test|certif|delf|dele|jlpt|hsk|toefl)/.test(s))                return SCHOOL;
  if (/(work|business|office|meeting|client|boss|colleague|professional)/.test(s))          return BUSINESS;
  if (/(pronunci|accent|sound|r-sound|u-sound|minimal|nasal|subtitle|show|movie|series|idiom|slang)/.test(s))               return PRONUNCIATION;
  if (/(friend|social|party|date|meet people|chat)/.test(s))                                return FRIENDS;
  return EVERYDAY;
}

/**
 * Preferred entry point when we have the user's goal preset.
 * Falls back to the keyword picker for legacy profiles or when the user
 * picked "Custom" (the free text is all we have).
 */
export function pickCurriculumForGoal(
  goalPreset: string,
  rawScenario: string
): Curriculum {
  switch (goalPreset) {
    case "travel":
    case "relocate":
      return TRAVEL;
    case "family":
      return FAMILY;
    case "school":
    case "test":
      return SCHOOL;
    case "business":
      return BUSINESS;
    case "friends":
      return FRIENDS;
    case "pronunciation":
    case "shows":
      return PRONUNCIATION;
    default:
      return pickCurriculumForScenario(rawScenario);
  }
}

// ─── Plan ops ───────────────────────────────────────────────────────────────

export type LessonStatus = "current" | "next" | "locked" | "done";

/**
 * Map a user's completed-lesson count onto the chosen curriculum.
 * Returns the lessons in order, annotated with status so the Plan tab can
 * render them without extra logic.
 */
export function buildPlan(
  curriculum: Curriculum,
  completedCount: number
): Array<PlannedLesson & { status: LessonStatus }> {
  return curriculum.lessons.map((lesson, i) => {
    let status: LessonStatus;
    if (i < completedCount) status = "done";
    else if (i === completedCount) status = "current";
    else if (i === completedCount + 1) status = "next";
    else status = "locked";
    return { ...lesson, status };
  });
}
