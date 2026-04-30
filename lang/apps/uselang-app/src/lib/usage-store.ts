// ── Usage / quota tracker ────────────────────────────────────────────────────
// Every second the tutor is actively working (listening / thinking /
// speaking) we ping this store. It rolls up by-day and exposes a summary
// that Home / Progress / Tutor can read to show a real usage meter.
//
// The free tier currently grants 15 minutes of tutor time per day. Promo
// codes can add minutes, grant trial days, or unlock pro. We keep the clock
// local to the device — no server round-trip — so the meter is snappy and
// works offline. Fraud doesn't matter for a personal app; if it ever does
// we'll move this server-side.

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Constants ────────────────────────────────────────────────────────────────

export const FREE_DAILY_SECONDS = 15 * 60;           // 15 min
export const TRIAL_DAILY_SECONDS = 45 * 60;          // 45 min during 7-day trial
export const PRO_DAILY_SECONDS = Number.POSITIVE_INFINITY;

const KEYS = {
  byDay: "lang:usage:byDay",                  // { "YYYY-M-D": seconds }
  plan: "lang:usage:plan",                    // "free" | "trial" | "pro"
  planUntil: "lang:usage:planUntil",          // epoch ms when plan reverts to free
  bonusSecondsByDay: "lang:usage:bonus",       // { "YYYY-M-D": seconds } — from promos
} as const;

// ── Types ────────────────────────────────────────────────────────────────────

export type UsagePlan = "free" | "trial" | "pro";

export interface UsageSummary {
  todaySeconds: number;
  todayLimitSeconds: number;       // Infinity for pro
  todayRemainingSeconds: number;   // Infinity for pro
  weekSeconds: number;
  last7DaysActive: number;
  plan: UsagePlan;
  planUntil: number | null;
  bonusSecondsToday: number;
  dayHistory: { date: string; seconds: number }[];   // most recent first, 14d
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function prevDayKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

async function readMap(key: string): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

async function writeMap(key: string, map: Record<string, number>): Promise<void> {
  // Prune anything older than 60 days so storage doesn't grow unbounded.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffKey = dayKey(cutoff);
  const pruned: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    // Naive lexical comparison would fail for months; turn into epoch.
    const [y, m, d] = k.split("-").map(Number);
    const [cy, cm, cd] = cutoffKey.split("-").map(Number);
    const ke = new Date(y, m - 1, d).getTime();
    const ce = new Date(cy, cm - 1, cd).getTime();
    if (ke >= ce) pruned[k] = v;
  }
  await AsyncStorage.setItem(key, JSON.stringify(pruned));
}

// ── Plan ─────────────────────────────────────────────────────────────────────

export async function getUsagePlan(): Promise<{ plan: UsagePlan; planUntil: number | null }> {
  try {
    const [p, u] = await Promise.all([
      AsyncStorage.getItem(KEYS.plan),
      AsyncStorage.getItem(KEYS.planUntil),
    ]);
    const plan = (p as UsagePlan) || "free";
    const planUntil = u ? Number(u) : null;
    // Expire trial / pro grant back to free if we're past the deadline.
    if (planUntil && Date.now() > planUntil) {
      await AsyncStorage.multiSet([[KEYS.plan, "free"], [KEYS.planUntil, ""]]);
      return { plan: "free", planUntil: null };
    }
    return { plan, planUntil };
  } catch {
    return { plan: "free", planUntil: null };
  }
}

export async function setUsagePlan(plan: UsagePlan, durationDays?: number): Promise<void> {
  const until = durationDays ? Date.now() + durationDays * 86_400_000 : null;
  const pairs: [string, string][] = [[KEYS.plan, plan]];
  pairs.push([KEYS.planUntil, until ? String(until) : ""]);
  await AsyncStorage.multiSet(pairs);
}

// ── Recording usage ──────────────────────────────────────────────────────────

/** Add N seconds of tutor activity to today's bucket. */
export async function addTutorSeconds(seconds: number): Promise<void> {
  if (!seconds || seconds <= 0) return;
  const map = await readMap(KEYS.byDay);
  const today = dayKey();
  map[today] = Math.round((map[today] || 0) + seconds);
  await writeMap(KEYS.byDay, map);
}

/** Add N bonus seconds to today (from a promo or ad reward). */
export async function addBonusSeconds(seconds: number): Promise<void> {
  if (!seconds || seconds <= 0) return;
  const map = await readMap(KEYS.bonusSecondsByDay);
  const today = dayKey();
  map[today] = Math.round((map[today] || 0) + seconds);
  await writeMap(KEYS.bonusSecondsByDay, map);
}

// ── Summary ──────────────────────────────────────────────────────────────────

export function limitSecondsForPlan(plan: UsagePlan): number {
  if (plan === "pro") return PRO_DAILY_SECONDS;
  if (plan === "trial") return TRIAL_DAILY_SECONDS;
  return FREE_DAILY_SECONDS;
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const [byDay, bonus, planInfo] = await Promise.all([
    readMap(KEYS.byDay),
    readMap(KEYS.bonusSecondsByDay),
    getUsagePlan(),
  ]);

  const today = dayKey();
  const todaySeconds = byDay[today] || 0;
  const bonusToday = bonus[today] || 0;
  const baseLimit = limitSecondsForPlan(planInfo.plan);
  const todayLimitSeconds = baseLimit === PRO_DAILY_SECONDS
    ? PRO_DAILY_SECONDS
    : baseLimit + bonusToday;

  const todayRemainingSeconds = todayLimitSeconds === PRO_DAILY_SECONDS
    ? PRO_DAILY_SECONDS
    : Math.max(0, todayLimitSeconds - todaySeconds);

  // Week window (last 7 days including today)
  let weekSeconds = 0;
  let activeDays = 0;
  const dayHistory: { date: string; seconds: number }[] = [];
  for (let i = 0; i < 14; i += 1) {
    const k = prevDayKey(i);
    const sec = byDay[k] || 0;
    dayHistory.push({ date: k, seconds: sec });
    if (i < 7) {
      weekSeconds += sec;
      if (sec > 0) activeDays += 1;
    }
  }

  return {
    todaySeconds,
    todayLimitSeconds,
    todayRemainingSeconds,
    weekSeconds,
    last7DaysActive: activeDays,
    plan: planInfo.plan,
    planUntil: planInfo.planUntil,
    bonusSecondsToday: bonusToday,
    dayHistory,
  };
}

// ── Format helpers ───────────────────────────────────────────────────────────

export function formatMinutes(seconds: number): string {
  if (!Number.isFinite(seconds)) return "Unlimited";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 10) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${m}m`;
}

export function formatMinutesLong(seconds: number): string {
  if (!Number.isFinite(seconds)) return "Unlimited";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m - h * 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}
