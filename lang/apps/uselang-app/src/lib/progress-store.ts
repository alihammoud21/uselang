// ── Progress tracking store ──────────────────────────────────────────────────
// Records every training attempt so the Progress tab can show trends.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  attempts: "lang:progress:attempts",
  weakSounds: "lang:progress:weakSounds",
  streak: "lang:progress:streak",
  lastActiveDay: "lang:progress:lastActiveDay",
  scenariosDone: "lang:progress:scenariosDone",
  confidence: "lang:progress:confidence",
  xp: "lang:progress:xp",
} as const;

const LEVEL_UP_COIN_BONUS = 25;

export interface AttemptRecord {
  ts: number;           // epoch ms
  languageCode: string;
  phrase: string;
  score: number;        // 0-100
  mode: "quick-ask" | "train" | "conversation";
}

export interface ProgressSummary {
  totalAttempts: number;
  avgScore: number;            // 0-100
  trendScore: number;          // last 10 attempts avg
  streak: number;              // consecutive days
  weakSounds: string[];        // recurring problem phonemes
  scenariosCompleted: string[];
  last7DaysActive: number;     // count of active days in last 7
  confidence: number;          // 0-100
  xp: number;
  level: ReturnType<typeof getLevel>;
  coins: number;
}

// ── XP & Levels ─────────────────────────────────────────────────────────────

const XP_REWARDS = {
  drillComplete: 10,
  accuracy80: 5,
  accuracy100: 15,
  streakPerDay: 5,
  lessonComplete: 25,
} as const;

// Generate 100 level thresholds — starts easy, ramps up
function buildThresholds(): number[] {
  const t: number[] = [0];
  let xp = 0;
  for (let i = 1; i < 100; i++) {
    const gap = Math.round(30 + i * 18 + i * i * 0.4);
    xp += gap;
    t.push(xp);
  }
  return t;
}
const LEVEL_THRESHOLDS: number[] = buildThresholds();

export function getLevel(xp: number): {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  progress: number;
} {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = level < LEVEL_THRESHOLDS.length
    ? LEVEL_THRESHOLDS[level]
    : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const range = nextThreshold - currentThreshold;
  const progress = level >= LEVEL_THRESHOLDS.length
    ? 1
    : range > 0 ? (xp - currentThreshold) / range : 1;

  return { level, currentXP: xp, nextLevelXP: nextThreshold, progress };
}

// ── Level unlocks ────────────────────────────────────────────────────────────
export interface LevelUnlock {
  level: number;
  label: string;
  icon: string;          // Ionicons name
  color: string;
}

export const LEVEL_UNLOCKS: LevelUnlock[] = [
  { level: 1,  label: "Quick Speak",              icon: "mic-outline",              color: "#A85D2E" },
  { level: 2,  label: "Daily Challenges",          icon: "calendar-outline",         color: "#7A4EA8" },
  { level: 3,  label: "Listen & Match",            icon: "headset",                  color: "#C8804A" },
  { level: 5,  label: "Adventure Stories",          icon: "book-outline",             color: "#3B6B8A" },
  { level: 7,  label: "Daily Jokes",               icon: "happy-outline",            color: "#5C7A4E" },
  { level: 10, label: "Custom Orb Skins",          icon: "ellipse-outline",          color: "#D4A017" },
  { level: 12, label: "Slow Speed Mode",           icon: "speedometer-outline",      color: "#3B82F6" },
  { level: 15, label: "Streak Freeze",             icon: "snow-outline",             color: "#06B6D4" },
  { level: 18, label: "Travel Phrase Pack",         icon: "airplane-outline",         color: "#8B5CF6" },
  { level: 20, label: "2× XP Boost",               icon: "flash-outline",            color: "#F59E0B" },
  { level: 22, label: "Hint Tokens",               icon: "bulb-outline",             color: "#EAB308" },
  { level: 25, label: "Food & Dining Pack",         icon: "restaurant-outline",       color: "#EF4444" },
  { level: 28, label: "Business Phrase Pack",       icon: "briefcase-outline",        color: "#6366F1" },
  { level: 30, label: "Midnight Theme",            icon: "moon-outline",             color: "#1E293B" },
  { level: 33, label: "Scholar Badge",             icon: "school-outline",           color: "#7A4A22" },
  { level: 35, label: "Sphere Doubler",            icon: "layers-outline",           color: "#A85D2E" },
  { level: 38, label: "Desert Sand Theme",         icon: "sunny-outline",            color: "#D97706" },
  { level: 40, label: "Polyglot Badge",            icon: "ribbon-outline",           color: "#5C7A4E" },
  { level: 45, label: "Exclusive World Pack",       icon: "globe-outline",            color: "#7C3AED" },
  { level: 50, label: "Gold Orb Skin",             icon: "ellipse",                  color: "#D4A017" },
  { level: 55, label: "Pronunciation Coach AI",    icon: "analytics-outline",        color: "#0EA5E9" },
  { level: 60, label: "Midnight Orb Skin",         icon: "ellipse",                  color: "#334155" },
  { level: 65, label: "Cultural Deep Dives",       icon: "compass-outline",          color: "#B45309" },
  { level: 70, label: "Language Certificate",       icon: "document-text-outline",    color: "#059669" },
  { level: 75, label: "Immersive Scenarios",        icon: "film-outline",             color: "#DC2626" },
  { level: 80, label: "Custom TTS Voice",          icon: "mic-circle-outline",       color: "#7C3AED" },
  { level: 85, label: "Platinum Orb Skin",         icon: "diamond-outline",          color: "#94A3B8" },
  { level: 90, label: "Master Badge",              icon: "trophy-outline",           color: "#D4A017" },
  { level: 95, label: "Native Speaker Mode",       icon: "chatbubbles-outline",      color: "#059669" },
  { level: 100, label: "Grandmaster Title",        icon: "star",                     color: "#F59E0B" },
];

export async function getXP(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.xp);
    return raw ? Number(raw) : 0;
  } catch { return 0; }
}

export async function addXP(
  amount: number,
): Promise<{ newXP: number; levelUp: boolean; level: number }> {
  // Apply XP boost if active (doubles amount, then self-consumes)
  let effectiveAmount = amount;
  try {
    const { hasXpBoost, consumeXpBoost } = await import("./shop-store");
    if (await hasXpBoost()) {
      effectiveAmount = amount * 2;
      await consumeXpBoost();
    }
  } catch { /* non-fatal */ }

  const prev = await getXP();
  const prevLevel = getLevel(prev).level;
  const newXP = Math.max(0, prev + effectiveAmount);
  await AsyncStorage.setItem(KEYS.xp, String(newXP));
  const newLevel = getLevel(newXP).level;
  const didLevelUp = newLevel > prevLevel;
  if (didLevelUp) {
    try {
      const { addCoins } = await import("./challenge-store");
      await addCoins(LEVEL_UP_COIN_BONUS * (newLevel - prevLevel));
    } catch { /* non-fatal */ }
  }
  return { newXP, levelUp: didLevelUp, level: newLevel };
}

async function awardDrillXP(score: number, streak: number): Promise<void> {
  let xp = XP_REWARDS.drillComplete;
  if (score >= 100) xp += XP_REWARDS.accuracy100;
  else if (score >= 80) xp += XP_REWARDS.accuracy80;
  if (streak > 0) xp += XP_REWARDS.streakPerDay * streak;
  await addXP(xp);
}

export async function awardLessonXP(): Promise<{ newXP: number; levelUp: boolean; level: number }> {
  return addXP(XP_REWARDS.lessonComplete);
}

// ── Attempts ─────────────────────────────────────────────────────────────────

async function readAttempts(): Promise<AttemptRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.attempts);
    return raw ? (JSON.parse(raw) as AttemptRecord[]) : [];
  } catch { return []; }
}

export async function recordAttempt(attempt: Omit<AttemptRecord, "ts">): Promise<void> {
  const all = await readAttempts();
  const entry: AttemptRecord = { ...attempt, ts: Date.now() };
  const next = [entry, ...all].slice(0, 1000);
  await AsyncStorage.setItem(KEYS.attempts, JSON.stringify(next));
  await bumpStreak();
  await recomputeConfidence(next);
  const streak = Number((await AsyncStorage.getItem(KEYS.streak)) || 0);
  await awardDrillXP(attempt.score, streak);
  // Track weekly challenge progress for daily_habit
  try {
    const { recordChallengeProgress } = await import("./challenge-store");
    await recordChallengeProgress("daily_habit");
  } catch { /* non-fatal */ }
}

// ── Weak sounds ──────────────────────────────────────────────────────────────

export async function getWeakSounds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.weakSounds);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export async function addWeakSound(sound: string): Promise<void> {
  const current = await getWeakSounds();
  const next = [sound, ...current.filter((s) => s !== sound)].slice(0, 8);
  await AsyncStorage.setItem(KEYS.weakSounds, JSON.stringify(next));
}

export async function clearWeakSound(sound: string): Promise<void> {
  const current = await getWeakSounds();
  await AsyncStorage.setItem(KEYS.weakSounds, JSON.stringify(current.filter((s) => s !== sound)));
}

// ── Streak ───────────────────────────────────────────────────────────────────

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function bumpStreak(): Promise<void> {
  const today = dayKey();
  const last = await AsyncStorage.getItem(KEYS.lastActiveDay);
  const currentStreak = Number((await AsyncStorage.getItem(KEYS.streak)) || 0);
  if (last === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isConsecutive = last === dayKey(yesterday);

  let nextStreak: number;
  if (isConsecutive) {
    // Normal: continuing a streak
    nextStreak = currentStreak + 1;
  } else if (last !== null && currentStreak > 0) {
    // Missed at least one day — try to consume streak freeze
    let frozen = false;
    try {
      const { hasStreakFreeze, consumeStreakFreeze } = await import("./shop-store");
      if (await hasStreakFreeze()) {
        await consumeStreakFreeze();
        frozen = true;
        console.log("[progress] Streak freeze consumed — streak preserved at", currentStreak);
      }
    } catch { /* non-fatal */ }
    nextStreak = frozen ? currentStreak + 1 : 1;
  } else {
    nextStreak = 1;
  }

  await AsyncStorage.multiSet([
    [KEYS.streak, String(nextStreak)],
    [KEYS.lastActiveDay, today],
  ]);
}

// ── Scenarios ────────────────────────────────────────────────────────────────

export async function completeScenario(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.scenariosDone);
  const done: string[] = raw ? JSON.parse(raw) : [];
  if (!done.includes(id)) {
    await AsyncStorage.setItem(KEYS.scenariosDone, JSON.stringify([...done, id]));
  }
}

// ── Confidence ───────────────────────────────────────────────────────────────

async function recomputeConfidence(attempts: AttemptRecord[]): Promise<void> {
  const recent = attempts.slice(0, 20);
  if (recent.length === 0) {
    await AsyncStorage.setItem(KEYS.confidence, "0");
    return;
  }
  const avg = recent.reduce((s, a) => s + a.score, 0) / recent.length;
  const volume = Math.min(1, recent.length / 20);
  const confidence = Math.round(avg * (0.6 + 0.4 * volume));
  await AsyncStorage.setItem(KEYS.confidence, String(confidence));
}

// ── Summary ──────────────────────────────────────────────────────────────────

export async function getProgressSummary(): Promise<ProgressSummary> {
  const [attempts, weakSounds, streakRaw, scenariosRaw, confRaw, xp] = await Promise.all([
    readAttempts(),
    getWeakSounds(),
    AsyncStorage.getItem(KEYS.streak),
    AsyncStorage.getItem(KEYS.scenariosDone),
    AsyncStorage.getItem(KEYS.confidence),
    getXP(),
  ]);

  let coins = 0;
  try {
    const { getCoinBalance } = await import("./challenge-store");
    coins = await getCoinBalance();
  } catch { /* non-fatal */ }

  const scenarios: string[] = scenariosRaw ? JSON.parse(scenariosRaw) : [];
  const totalAttempts = attempts.length;
  const avgScore = totalAttempts ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalAttempts) : 0;
  const recent = attempts.slice(0, 10);
  const trendScore = recent.length ? Math.round(recent.reduce((s, a) => s + a.score, 0) / recent.length) : 0;

  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const activeDays = new Set(
    attempts.filter((a) => a.ts >= sevenDaysAgo).map((a) => dayKey(new Date(a.ts)))
  );

  return {
    totalAttempts,
    avgScore,
    trendScore,
    streak: Number(streakRaw || 0),
    weakSounds,
    scenariosCompleted: scenarios,
    last7DaysActive: activeDays.size,
    confidence: Number(confRaw || 0),
    xp,
    level: getLevel(xp),
    coins,
  };
}

export async function getRecentAttempts(limit = 10): Promise<AttemptRecord[]> {
  return (await readAttempts()).slice(0, limit);
}

// ── Recent Activity Log ─────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  type: "lesson" | "game" | "practice" | "exam" | "challenge" | "shop";
  label: string;
  detail: string;
  ts: number;
  xp?: number;
}

const ACTIVITY_KEY = "lang:activityLog";
const MAX_ACTIVITY = 50;

export async function logActivity(entry: Omit<ActivityEntry, "id" | "ts">): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVITY_KEY);
    const log: ActivityEntry[] = raw ? JSON.parse(raw) : [];
    log.unshift({ ...entry, id: `act-${Date.now()}`, ts: Date.now() });
    await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(log.slice(0, MAX_ACTIVITY)));
  } catch { /* non-fatal */ }
}

export async function getActivityLog(limit = 20): Promise<ActivityEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVITY_KEY);
    const log: ActivityEntry[] = raw ? JSON.parse(raw) : [];
    return log.slice(0, limit);
  } catch {
    return [];
  }
}

/** Export progress data as JSON string (for sharing / saving) */
export async function exportProgressData(): Promise<string> {
  const [summary, activities, attempts] = await Promise.all([
    getProgressSummary(),
    getActivityLog(50),
    getRecentAttempts(50),
  ]);
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    summary,
    recentActivities: activities,
    recentAttempts: attempts,
  }, null, 2);
}
