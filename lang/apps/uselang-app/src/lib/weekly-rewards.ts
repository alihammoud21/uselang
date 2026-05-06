// ── Daily Spin-the-Wheel Rewards ─────────────────────────────────────────────
// One free spin per day. Auto-pops up when app opens.
// 8 slices with weighted probabilities. "Try Again" slice possible.
// 100% offline via AsyncStorage.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  lastSpinDay: "lang:dailyReward:lastSpinDay",
  history: "lang:dailyReward:history",
} as const;

export interface RewardSlice {
  id: string;
  label: string;
  icon: string;       // Ionicons name
  color: string;
  weight: number;      // higher = more likely
  action: "coins" | "pack" | "badge" | "orb" | "hat" | "voice" | "nothing";
  value?: number;      // for coins
}

export const REWARD_SLICES: RewardSlice[] = [
  { id: "coins_200", label: "200 Spheres", icon: "ellipse", color: "#F59E0B", weight: 25, action: "coins", value: 200 },
  { id: "coins_500", label: "500 Spheres", icon: "ellipse", color: "#D4A017", weight: 10, action: "coins", value: 500 },
  { id: "free_pack", label: "Free Pack", icon: "gift-outline", color: "#8B5CF6", weight: 12, action: "pack" },
  { id: "dev_badge", label: "Dev Badge", icon: "code-slash-outline", color: "#0EA5E9", weight: 5, action: "badge" },
  { id: "orb_skin", label: "Random Orb", icon: "ellipse-outline", color: "#EC4899", weight: 8, action: "orb" },
  { id: "sphere_hat", label: "Sphere Hat", icon: "happy-outline", color: "#14B8A6", weight: 8, action: "hat" },
  { id: "ai_voice", label: "AI Voice Mod", icon: "volume-high-outline", color: "#6366F1", weight: 7, action: "voice" },
  { id: "try_again", label: "Try Again", icon: "refresh-outline", color: "#6B7280", weight: 25, action: "nothing" },
];

function getDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** @deprecated Use canSpinToday() instead */
export async function canSpinThisWeek(): Promise<boolean> {
  return canSpinToday();
}

export async function canSpinToday(): Promise<boolean> {
  const lastDay = await AsyncStorage.getItem(KEYS.lastSpinDay);
  return lastDay !== getDayKey();
}

/** Weighted random selection */
export function spinWheel(): RewardSlice {
  const totalWeight = REWARD_SLICES.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const slice of REWARD_SLICES) {
    rand -= slice.weight;
    if (rand <= 0) return slice;
  }
  return REWARD_SLICES[REWARD_SLICES.length - 1];
}

/** Apply the reward and mark the week as spun */
export async function claimReward(slice: RewardSlice): Promise<void> {
  // Mark day
  await AsyncStorage.setItem(KEYS.lastSpinDay, getDayKey());

  // Apply effect
  switch (slice.action) {
    case "coins": {
      const { addCoins } = await import("./challenge-store");
      await addCoins(slice.value ?? 200);
      break;
    }
    case "pack": {
      // Give a random postcard pack
      await AsyncStorage.setItem("lang:weeklyReward:freePack", "1");
      break;
    }
    case "badge": {
      await AsyncStorage.setItem("lang:devBadge", "1");
      break;
    }
    case "orb": {
      // Random orb skin
      const orbs = ["gold", "midnight", "ocean", "forest"];
      const pick = orbs[Math.floor(Math.random() * orbs.length)];
      await AsyncStorage.setItem("lang:shop:orb", pick);
      await AsyncStorage.setItem(`lang:shop:${pick}_orb`, "1");
      break;
    }
    case "hat": {
      await AsyncStorage.setItem("lang:shop:sphereHat", "1");
      break;
    }
    case "voice": {
      await AsyncStorage.setItem("lang:devMode", "1");
      break;
    }
    case "nothing":
      // No reward — try again next week
      break;
  }

  // History
  try {
    const raw = await AsyncStorage.getItem(KEYS.history);
    const hist: string[] = raw ? JSON.parse(raw) : [];
    hist.unshift(`${getDayKey()}:${slice.id}`);
    await AsyncStorage.setItem(KEYS.history, JSON.stringify(hist.slice(0, 52)));
  } catch { /* non-fatal */ }
}

export async function getSpinHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.history);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
