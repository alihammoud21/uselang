// ── Weekly Challenge Store ───────────────────────────────────────────────────
// All challenges reset every Monday at midnight (local time).
// Progress and coin balance live in AsyncStorage — 100% offline.

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Keys ─────────────────────────────────────────────────────────────────────
const KEYS = {
  weekState:    "lang:challenges:weekState",
  coinBalance:  "lang:challenges:coins",
} as const;

// ── Challenge definitions ────────────────────────────────────────────────────

export type ChallengeId =
  | "speak_phrases"
  | "unlock_location"
  | "complete_lessons"
  | "daily_habit"
  | "precision_drill"
  | "learn_vocab"
  | "practice_marathon";

export interface ChallengeDef {
  id: ChallengeId;
  title: string;
  description: string;
  goal: number;
  coins: number;
  unit: string;         // label for the counter, e.g. "phrases"
  icon: string;         // Ionicons name
  color: string;
  bg: string;
}

export const CHALLENGE_DEFS: ChallengeDef[] = [
  {
    id: "speak_phrases",
    title: "Phrase Streak",
    description: "Speak 15 phrases this week",
    goal: 15,
    coins: 50,
    unit: "phrases",
    icon: "mic-outline",
    color: "#A85D2E",
    bg: "rgba(168,93,46,0.10)",
  },
  {
    id: "unlock_location",
    title: "World Explorer",
    description: "Unlock 1 new map location",
    goal: 1,
    coins: 75,
    unit: "locations",
    icon: "earth-outline",
    color: "#3B6B8A",
    bg: "rgba(59,107,138,0.10)",
  },
  {
    id: "complete_lessons",
    title: "Lesson Grind",
    description: "Complete 3 lessons this week",
    goal: 3,
    coins: 100,
    unit: "lessons",
    icon: "book-outline",
    color: "#5C7A4E",
    bg: "rgba(92,122,78,0.10)",
  },
  {
    id: "daily_habit",
    title: "Daily Habit",
    description: "Practice on 5 different days",
    goal: 5,
    coins: 80,
    unit: "days",
    icon: "calendar-outline",
    color: "#7A4EA8",
    bg: "rgba(122,78,168,0.10)",
  },
  {
    id: "precision_drill",
    title: "Precision Driller",
    description: "Score 90%+ on 10 phrases",
    goal: 10,
    coins: 60,
    unit: "perfect phrases",
    icon: "checkmark-circle-outline",
    color: "#D4A017",
    bg: "rgba(212,160,23,0.10)",
  },
  {
    id: "learn_vocab",
    title: "Polyglot Path",
    description: "Learn 30 new vocab words",
    goal: 30,
    coins: 40,
    unit: "words",
    icon: "text-outline",
    color: "#A84E6B",
    bg: "rgba(168,78,107,0.10)",
  },
  {
    id: "practice_marathon",
    title: "Marathon",
    description: "Log 60 minutes of practice",
    goal: 60,
    coins: 90,
    unit: "minutes",
    icon: "timer-outline",
    color: "#2A7A6E",
    bg: "rgba(42,122,110,0.10)",
  },
];

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChallengeState {
  id: ChallengeId;
  progress: number;
  claimed: boolean;
}

export interface WeekState {
  weekKey: string;    // "2025-W18" — ISO week
  challenges: ChallengeState[];
}

export interface ChallengeWithDef extends ChallengeDef, ChallengeState {
  completed: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function currentWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function defaultWeekState(): WeekState {
  return {
    weekKey: currentWeekKey(),
    challenges: CHALLENGE_DEFS.map((d) => ({ id: d.id, progress: 0, claimed: false })),
  };
}

async function readWeekState(): Promise<WeekState> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.weekState);
    if (!raw) return defaultWeekState();
    const parsed: WeekState = JSON.parse(raw);
    // Reset if it's a new week
    if (parsed.weekKey !== currentWeekKey()) return defaultWeekState();
    // Ensure all challenges are present (handles newly added challenges)
    const existing = new Set(parsed.challenges.map((c) => c.id));
    for (const def of CHALLENGE_DEFS) {
      if (!existing.has(def.id)) {
        parsed.challenges.push({ id: def.id, progress: 0, claimed: false });
      }
    }
    return parsed;
  } catch {
    return defaultWeekState();
  }
}

async function saveWeekState(state: WeekState): Promise<void> {
  await AsyncStorage.setItem(KEYS.weekState, JSON.stringify(state));
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Returns all challenges merged with their definitions and computed `completed` flag. */
export async function getChallenges(): Promise<ChallengeWithDef[]> {
  const state = await readWeekState();
  return CHALLENGE_DEFS.map((def) => {
    const cs = state.challenges.find((c) => c.id === def.id) ?? { id: def.id, progress: 0, claimed: false };
    return {
      ...def,
      ...cs,
      completed: cs.progress >= def.goal,
    };
  });
}

/**
 * Increment a challenge's progress counter.
 * @param id  Challenge ID
 * @param delta  Amount to add (default 1)
 */
export async function recordChallengeProgress(id: ChallengeId, delta = 1): Promise<void> {
  const state = await readWeekState();
  const entry = state.challenges.find((c) => c.id === id);
  const def = CHALLENGE_DEFS.find((d) => d.id === id);
  if (!entry || !def) return;
  if (entry.claimed) return; // already done
  entry.progress = Math.min(entry.progress + delta, def.goal);
  await saveWeekState(state);
}

/**
 * Claim the coin reward for a completed challenge.
 * Returns the coins awarded (0 if already claimed or not completed).
 */
export async function claimChallenge(id: ChallengeId): Promise<number> {
  const state = await readWeekState();
  const entry = state.challenges.find((c) => c.id === id);
  const def = CHALLENGE_DEFS.find((d) => d.id === id);
  if (!entry || !def) return 0;
  if (entry.claimed || entry.progress < def.goal) return 0;
  entry.claimed = true;
  await saveWeekState(state);

  // Apply coin doubler if active
  let coinAmount = def.coins;
  try {
    const { hasCoinDoubler, consumeCoinDoubler } = await import("./shop-store");
    if (await hasCoinDoubler()) {
      coinAmount = def.coins * 2;
      await consumeCoinDoubler();
    }
  } catch { /* non-fatal */ }

  await addCoins(coinAmount);
  return coinAmount;
}

// ── Coin balance ─────────────────────────────────────────────────────────────

export async function getCoinBalance(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.coinBalance);
    return raw ? Number(raw) : 0;
  } catch { return 0; }
}

export async function addCoins(amount: number): Promise<number> {
  const current = await getCoinBalance();
  const next = Math.max(0, current + amount);
  await AsyncStorage.setItem(KEYS.coinBalance, String(next));
  return next;
}

export async function spendCoins(amount: number): Promise<{ success: boolean; balance: number }> {
  const current = await getCoinBalance();
  if (current < amount) return { success: false, balance: current };
  const next = current - amount;
  await AsyncStorage.setItem(KEYS.coinBalance, String(next));
  return { success: true, balance: next };
}
