// ── Shop Store ────────────────────────────────────────────────────────────────
// All purchases persist in AsyncStorage. Each item has a functional effect
// consumed by the relevant part of the app.
// 100% offline.

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Keys ─────────────────────────────────────────────────────────────────────
const KEYS = {
  owned:        "lang:shop:owned",        // JSON array of owned item IDs
  streakFreeze: "lang:shop:streakFreeze", // "1" = active
  xpBoost:      "lang:shop:xpBoost",     // "1" = active (consumed on next addXP)
  hintTokens:   "lang:shop:hintTokens",  // numeric string
  slowSpeed:    "lang:shop:slowSpeed",   // "1" = unlocked
  packTravel:   "lang:shop:packTravel",  // "1" = unlocked
  packFood:     "lang:shop:packFood",    // "1" = unlocked
  packBusiness: "lang:shop:packBusiness",// "1" = unlocked
  theme:        "lang:shop:theme",       // "default" | "dark" | "sand"
  orb:          "lang:shop:orb",         // "default" | "gold" | "midnight"
  badge:        "lang:shop:badge",       // "none" | "polyglot" | "scholar"
} as const;

// ── Item catalog ─────────────────────────────────────────────────────────────

export type ShopItemId =
  | "streak_freeze"
  | "xp_boost"
  | "hint_token"
  | "slow_speed"
  | "pack_travel"
  | "pack_food"
  | "pack_business"
  | "dark_theme"
  | "sand_theme"
  | "gold_orb"
  | "midnight_orb"
  | "badge_polyglot"
  | "badge_scholar"
  | "coin_doubler";

export type ItemCategory = "utility" | "boost" | "cosmetic" | "pack";

export interface ShopItem {
  id: ShopItemId;
  name: string;
  description: string;
  price: number;
  levelRequired: number;
  icon: string;        // Ionicons name
  iconColor: string;
  iconBg: string;
  category: ItemCategory;
  consumable: boolean; // true = used up; false = permanent unlock
  maxOwned?: number;   // for consumables that stack (e.g. hint tokens)
}

export const SHOP_CATALOG: ShopItem[] = [
  // ── Utility ─────────────────────────────────────────────────────────────
  {
    id: "streak_freeze",
    name: "Streak Freeze",
    description: "Protect your streak for one day if you miss practice.",
    price: 150,
    levelRequired: 1,
    icon: "snow-outline",
    iconColor: "#3B82F6",
    iconBg: "rgba(59,130,246,0.12)",
    category: "utility",
    consumable: true,
  },
  {
    id: "hint_token",
    name: "Hint Tokens ×3",
    description: "Reveal the correct answer once during a lesson exercise.",
    price: 80,
    levelRequired: 1,
    icon: "bulb-outline",
    iconColor: "#D4A017",
    iconBg: "rgba(212,160,23,0.12)",
    category: "utility",
    consumable: true,
    maxOwned: 99,
  },
  {
    id: "slow_speed",
    name: "Slow Playback",
    description: "Unlock 0.6× voice speed option in the Speak tab.",
    price: 120,
    levelRequired: 1,
    icon: "speedometer-outline",
    iconColor: "#7C6AC0",
    iconBg: "rgba(124,106,192,0.12)",
    category: "utility",
    consumable: false,
  },
  // ── Boosts ─────────────────────────────────────────────────────────────
  {
    id: "xp_boost",
    name: "XP Boost",
    description: "Earn 2× XP on your next practice session.",
    price: 200,
    levelRequired: 2,
    icon: "flash-outline",
    iconColor: "#D4A017",
    iconBg: "rgba(212,160,23,0.12)",
    category: "boost",
    consumable: true,
  },
  {
    id: "coin_doubler",
    name: "Coin Doubler",
    description: "Earn 2× coins from your next completed weekly challenge.",
    price: 250,
    levelRequired: 4,
    icon: "layers-outline",
    iconColor: "#A85D2E",
    iconBg: "rgba(168,93,46,0.12)",
    category: "boost",
    consumable: true,
  },
  // ── Phrase Packs ────────────────────────────────────────────────────────
  {
    id: "pack_travel",
    name: "Travel Pack",
    description: "Unlock 30 travel phrases (airports, hotels, directions).",
    price: 180,
    levelRequired: 2,
    icon: "airplane-outline",
    iconColor: "#2A7A6E",
    iconBg: "rgba(42,122,110,0.12)",
    category: "pack",
    consumable: false,
  },
  {
    id: "pack_food",
    name: "Food & Dining Pack",
    description: "Unlock 30 restaurant, café, and market phrases.",
    price: 180,
    levelRequired: 2,
    icon: "restaurant-outline",
    iconColor: "#A84E6B",
    iconBg: "rgba(168,78,107,0.12)",
    category: "pack",
    consumable: false,
  },
  {
    id: "pack_business",
    name: "Business Pack",
    description: "Unlock 25 formal, meeting, and professional phrases.",
    price: 300,
    levelRequired: 6,
    icon: "briefcase-outline",
    iconColor: "#3B6B8A",
    iconBg: "rgba(59,107,138,0.12)",
    category: "pack",
    consumable: false,
  },
  // ── Cosmetics ───────────────────────────────────────────────────────────
  {
    id: "dark_theme",
    name: "Midnight Theme",
    description: "A deep-navy dark UI theme for the whole app.",
    price: 300,
    levelRequired: 5,
    icon: "moon-outline",
    iconColor: "#7C6AC0",
    iconBg: "rgba(124,106,192,0.12)",
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "sand_theme",
    name: "Desert Sand Theme",
    description: "Warm terracotta and sand tones throughout the app.",
    price: 300,
    levelRequired: 5,
    icon: "sunny-outline",
    iconColor: "#C97B3A",
    iconBg: "rgba(201,123,58,0.12)",
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "gold_orb",
    name: "Gold Orb",
    description: "Replace the Speak orb with a premium gold gradient skin.",
    price: 400,
    levelRequired: 8,
    icon: "radio-button-on-outline",
    iconColor: "#C9A465",
    iconBg: "rgba(201,164,101,0.14)",
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "midnight_orb",
    name: "Midnight Orb",
    description: "Deep indigo orb with silver ring for late-night study.",
    price: 400,
    levelRequired: 8,
    icon: "ellipse-outline",
    iconColor: "#6366F1",
    iconBg: "rgba(99,102,241,0.12)",
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "badge_polyglot",
    name: "Polyglot Badge",
    description: "A cosmetic badge shown on your profile stats.",
    price: 100,
    levelRequired: 3,
    icon: "ribbon-outline",
    iconColor: "#5C7A4E",
    iconBg: "rgba(92,122,78,0.12)",
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "badge_scholar",
    name: "Scholar Badge",
    description: "The scholar crest badge — earned by the dedicated.",
    price: 500,
    levelRequired: 10,
    icon: "school-outline",
    iconColor: "#7A4A22",
    iconBg: "rgba(122,74,34,0.12)",
    category: "cosmetic",
    consumable: false,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOwnedIds(): Promise<ShopItemId[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.owned);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function addOwned(id: ShopItemId): Promise<void> {
  const existing = await getOwnedIds();
  if (!existing.includes(id)) {
    await AsyncStorage.setItem(KEYS.owned, JSON.stringify([...existing, id]));
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if the item is already owned. */
export async function isOwned(id: ShopItemId): Promise<boolean> {
  const owned = await getOwnedIds();
  return owned.includes(id);
}

/** Returns all owned item IDs. */
export async function getInventory(): Promise<ShopItemId[]> {
  return getOwnedIds();
}

/**
 * Purchase an item. Returns an error string on failure, or null on success.
 * Caller must subtract coins first via challenge-store.spendCoins().
 */
export async function purchaseItem(id: ShopItemId): Promise<string | null> {
  const item = SHOP_CATALOG.find((i) => i.id === id);
  if (!item) return "Item not found";

  // Apply the item effect
  switch (id) {
    case "streak_freeze":
      await AsyncStorage.setItem(KEYS.streakFreeze, "1");
      break;
    case "xp_boost":
      await AsyncStorage.setItem(KEYS.xpBoost, "1");
      break;
    case "hint_token": {
      const current = Number(await AsyncStorage.getItem(KEYS.hintTokens) || "0");
      await AsyncStorage.setItem(KEYS.hintTokens, String(current + 3));
      break;
    }
    case "slow_speed":
      await AsyncStorage.setItem(KEYS.slowSpeed, "1");
      break;
    case "pack_travel":
      await AsyncStorage.setItem(KEYS.packTravel, "1");
      break;
    case "pack_food":
      await AsyncStorage.setItem(KEYS.packFood, "1");
      break;
    case "pack_business":
      await AsyncStorage.setItem(KEYS.packBusiness, "1");
      break;
    case "dark_theme":
      await AsyncStorage.setItem(KEYS.theme, "dark");
      break;
    case "sand_theme":
      await AsyncStorage.setItem(KEYS.theme, "sand");
      break;
    case "gold_orb":
      await AsyncStorage.setItem(KEYS.orb, "gold");
      break;
    case "midnight_orb":
      await AsyncStorage.setItem(KEYS.orb, "midnight");
      break;
    case "badge_polyglot":
      await AsyncStorage.setItem(KEYS.badge, "polyglot");
      break;
    case "badge_scholar":
      await AsyncStorage.setItem(KEYS.badge, "scholar");
      break;
    case "coin_doubler":
      await AsyncStorage.setItem("lang:shop:coinDoubler", "1");
      break;
  }

  await addOwned(id);
  return null;
}

// ── Effect readers (consumed by other parts of the app) ──────────────────────

export async function hasStreakFreeze(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.streakFreeze)) === "1";
}

export async function consumeStreakFreeze(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.streakFreeze);
}

export async function hasXpBoost(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.xpBoost)) === "1";
}

export async function consumeXpBoost(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.xpBoost);
}

export async function getHintTokens(): Promise<number> {
  return Number(await AsyncStorage.getItem(KEYS.hintTokens) || "0");
}

export async function consumeHintToken(): Promise<boolean> {
  const n = await getHintTokens();
  if (n <= 0) return false;
  await AsyncStorage.setItem(KEYS.hintTokens, String(n - 1));
  return true;
}

export async function hasSlowSpeed(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.slowSpeed)) === "1";
}

export async function hasPack(pack: "travel" | "food" | "business"): Promise<boolean> {
  const key = pack === "travel" ? KEYS.packTravel : pack === "food" ? KEYS.packFood : KEYS.packBusiness;
  return (await AsyncStorage.getItem(key)) === "1";
}

export async function getActiveTheme(): Promise<"default" | "dark" | "sand"> {
  const val = await AsyncStorage.getItem(KEYS.theme);
  if (val === "dark" || val === "sand") return val;
  return "default";
}

export async function getActiveOrb(): Promise<"default" | "gold" | "midnight"> {
  const val = await AsyncStorage.getItem(KEYS.orb);
  if (val === "gold" || val === "midnight") return val;
  return "default";
}

export async function getActiveBadge(): Promise<"none" | "polyglot" | "scholar"> {
  const val = await AsyncStorage.getItem(KEYS.badge);
  if (val === "polyglot" || val === "scholar") return val;
  return "none";
}

export async function hasCoinDoubler(): Promise<boolean> {
  return (await AsyncStorage.getItem("lang:shop:coinDoubler")) === "1";
}

export async function consumeCoinDoubler(): Promise<void> {
  await AsyncStorage.removeItem("lang:shop:coinDoubler");
}
