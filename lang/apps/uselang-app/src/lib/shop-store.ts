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
  | "pack_slang"
  | "pack_emergency"
  | "pack_romance"
  | "pack_social"
  | "pack_music"
  | "pack_sports"
  | "pack_medical"
  | "pack_tech"
  | "dark_theme"
  | "sand_theme"
  | "sunset_theme"
  | "nordic_theme"
  | "sakura_theme"
  | "gold_orb"
  | "midnight_orb"
  | "ocean_orb"
  | "forest_orb"
  | "badge_polyglot"
  | "badge_scholar"
  | "badge_explorer"
  | "badge_streak_master"
  | "badge_neon"
  | "coin_doubler"
  | "xp_weekend"
  | "streak_shield"
  | "challenge_refresh"
  | "bonus_drop"
  | "double_hints"
  | "timer_freeze"
  | "auto_replay"
  | "phonetic_mode"
  | "game_flappy_boat"
  | "game_memory_match"
  | "game_word_chase"
  | "game_listen_match";

export type ItemCategory = "utility" | "boost" | "cosmetic" | "pack" | "game";

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
  // ══════════════════════════════════════════════════════════════════════════
  // ── Games ──────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "game_flappy_boat",
    name: "Flappy Boat",
    description: "Tap to fly through word gates — pick the right translation to survive!",
    price: 250,
    levelRequired: 1,
    icon: "boat-outline",
    iconColor: "#0EA5E9",
    iconBg: "rgba(14,165,233,0.12)",
    category: "game",
    consumable: false,
  },
  {
    id: "game_memory_match",
    name: "Memory Match",
    description: "Flip cards and match words to their translations. Train your memory!",
    price: 200,
    levelRequired: 1,
    icon: "grid-outline",
    iconColor: "#8B5CF6",
    iconBg: "rgba(139,92,246,0.12)",
    category: "game",
    consumable: false,
  },
  {
    id: "game_word_chase",
    name: "Word Chase",
    description: "Navigate the maze, collect correct translations, dodge the wrong ones!",
    price: 300,
    levelRequired: 1,
    icon: "navigate-outline",
    iconColor: "#F59E0B",
    iconBg: "rgba(245,158,11,0.12)",
    category: "game",
    consumable: false,
  },
  {
    id: "game_listen_match",
    name: "Listen & Match",
    description: "Hear a word spoken aloud and tap the correct meaning. 10 rounds!",
    price: 150,
    levelRequired: 1,
    icon: "headset-outline",
    iconColor: "#EC4899",
    iconBg: "rgba(236,72,153,0.12)",
    category: "game",
    consumable: false,
  },
  // ══════════════════════════════════════════════════════════════════════════
  // ── Utility ────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
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
    id: "double_hints",
    name: "Hint Tokens ×6",
    description: "A bigger bundle — 6 hint tokens at a discount.",
    price: 140,
    levelRequired: 1,
    icon: "bulb",
    iconColor: "#EAB308",
    iconBg: "rgba(234,179,8,0.12)",
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
  {
    id: "timer_freeze",
    name: "Timer Freeze",
    description: "Pause the lesson timer for 30 seconds during timed exercises.",
    price: 100,
    levelRequired: 2,
    icon: "time-outline",
    iconColor: "#06B6D4",
    iconBg: "rgba(6,182,212,0.12)",
    category: "utility",
    consumable: true,
    maxOwned: 10,
  },
  {
    id: "auto_replay",
    name: "Auto-Replay",
    description: "Automatically replay TTS audio 3 times for better listening practice.",
    price: 90,
    levelRequired: 1,
    icon: "repeat-outline",
    iconColor: "#10B981",
    iconBg: "rgba(16,185,129,0.12)",
    category: "utility",
    consumable: false,
  },
  {
    id: "phonetic_mode",
    name: "Always Show Phonetics",
    description: "Permanently display pinyin / pronunciation guides on all screens.",
    price: 160,
    levelRequired: 1,
    icon: "text-outline",
    iconColor: "#6366F1",
    iconBg: "rgba(99,102,241,0.12)",
    category: "utility",
    consumable: false,
  },
  // ══════════════════════════════════════════════════════════════════════════
  // ── Boosts ─────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
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
  {
    id: "xp_weekend",
    name: "3× XP Weekend",
    description: "Triple XP on all activities until Monday.",
    price: 400,
    levelRequired: 3,
    icon: "rocket-outline",
    iconColor: "#F97316",
    iconBg: "rgba(249,115,22,0.12)",
    category: "boost",
    consumable: true,
  },
  {
    id: "streak_shield",
    name: "Streak Shield (3 days)",
    description: "Protect your streak for 3 consecutive days.",
    price: 350,
    levelRequired: 3,
    icon: "shield-checkmark-outline",
    iconColor: "#3B82F6",
    iconBg: "rgba(59,130,246,0.12)",
    category: "boost",
    consumable: true,
  },
  {
    id: "challenge_refresh",
    name: "Challenge Refresh",
    description: "Reroll your weekly challenges for new objectives.",
    price: 180,
    levelRequired: 2,
    icon: "refresh-outline",
    iconColor: "#14B8A6",
    iconBg: "rgba(20,184,166,0.12)",
    category: "boost",
    consumable: true,
  },
  {
    id: "bonus_drop",
    name: "Bonus Sphere Drop",
    description: "Instantly receive 100 bonus spheres.",
    price: 50,
    levelRequired: 1,
    icon: "gift-outline",
    iconColor: "#A855F7",
    iconBg: "rgba(168,85,247,0.12)",
    category: "boost",
    consumable: true,
    maxOwned: 99,
  },
  // ══════════════════════════════════════════════════════════════════════════
  // ── Phrase Packs ───────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
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
  {
    id: "pack_slang",
    name: "Slang & Informal",
    description: "Sound like a local — 25 casual expressions and slang.",
    price: 220,
    levelRequired: 3,
    icon: "chatbubble-ellipses-outline",
    iconColor: "#F472B6",
    iconBg: "rgba(244,114,182,0.12)",
    category: "pack",
    consumable: false,
  },
  {
    id: "pack_emergency",
    name: "Emergency Pack",
    description: "Critical phrases for emergencies, police, and hospitals.",
    price: 150,
    levelRequired: 1,
    icon: "alert-circle-outline",
    iconColor: "#EF4444",
    iconBg: "rgba(239,68,68,0.12)",
    category: "pack",
    consumable: false,
  },
  {
    id: "pack_romance",
    name: "Romance Pack",
    description: "Flirting, compliments, and love expressions.",
    price: 200,
    levelRequired: 3,
    icon: "heart-outline",
    iconColor: "#F43F5E",
    iconBg: "rgba(244,63,94,0.12)",
    category: "pack",
    consumable: false,
  },
  {
    id: "pack_social",
    name: "Social Media Pack",
    description: "Modern internet and social media vocabulary.",
    price: 160,
    levelRequired: 2,
    icon: "logo-instagram",
    iconColor: "#E040FB",
    iconBg: "rgba(224,64,251,0.10)",
    category: "pack",
    consumable: false,
  },
  {
    id: "pack_music",
    name: "Music & Arts Pack",
    description: "Talk about music, instruments, film, and art.",
    price: 180,
    levelRequired: 2,
    icon: "musical-notes-outline",
    iconColor: "#7C3AED",
    iconBg: "rgba(124,58,237,0.12)",
    category: "pack",
    consumable: false,
  },
  {
    id: "pack_sports",
    name: "Sports Pack",
    description: "Football, basketball, gym, and competition phrases.",
    price: 180,
    levelRequired: 2,
    icon: "football-outline",
    iconColor: "#16A34A",
    iconBg: "rgba(22,163,74,0.12)",
    category: "pack",
    consumable: false,
  },
  {
    id: "pack_medical",
    name: "Medical Pack",
    description: "Doctor visits, symptoms, pharmacy, and health vocabulary.",
    price: 240,
    levelRequired: 4,
    icon: "medkit-outline",
    iconColor: "#DC2626",
    iconBg: "rgba(220,38,38,0.10)",
    category: "pack",
    consumable: false,
  },
  {
    id: "pack_tech",
    name: "Tech Pack",
    description: "Computers, apps, internet, and tech-world vocabulary.",
    price: 200,
    levelRequired: 3,
    icon: "hardware-chip-outline",
    iconColor: "#0891B2",
    iconBg: "rgba(8,145,178,0.12)",
    category: "pack",
    consumable: false,
  },
  // ══════════════════════════════════════════════════════════════════════════
  // ── Cosmetics ──────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
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
    id: "sunset_theme",
    name: "Sunset Theme",
    description: "Warm orange and purple gradients inspired by golden hour.",
    price: 350,
    levelRequired: 5,
    icon: "partly-sunny-outline",
    iconColor: "#F97316",
    iconBg: "rgba(249,115,22,0.12)",
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "nordic_theme",
    name: "Nordic Theme",
    description: "Cool blues and whites — clean Scandinavian aesthetic.",
    price: 350,
    levelRequired: 5,
    icon: "snow-outline",
    iconColor: "#38BDF8",
    iconBg: "rgba(56,189,248,0.12)",
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "sakura_theme",
    name: "Sakura Theme",
    description: "Soft pink cherry blossom tones for a calming experience.",
    price: 350,
    levelRequired: 5,
    icon: "flower-outline",
    iconColor: "#F472B6",
    iconBg: "rgba(244,114,182,0.12)",
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
    id: "ocean_orb",
    name: "Ocean Orb",
    description: "A deep-sea teal orb that shimmers like water.",
    price: 400,
    levelRequired: 6,
    icon: "water-outline",
    iconColor: "#0891B2",
    iconBg: "rgba(8,145,178,0.12)",
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "forest_orb",
    name: "Forest Orb",
    description: "Emerald green orb with a natural, earthy glow.",
    price: 400,
    levelRequired: 6,
    icon: "leaf-outline",
    iconColor: "#16A34A",
    iconBg: "rgba(22,163,74,0.12)",
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
  {
    id: "badge_explorer",
    name: "Explorer Badge",
    description: "For those who venture into every corner of the app.",
    price: 200,
    levelRequired: 4,
    icon: "compass-outline",
    iconColor: "#0EA5E9",
    iconBg: "rgba(14,165,233,0.12)",
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "badge_streak_master",
    name: "Streak Master Badge",
    description: "Show off your dedication with this fiery badge.",
    price: 350,
    levelRequired: 7,
    icon: "flame-outline",
    iconColor: "#F97316",
    iconBg: "rgba(249,115,22,0.12)",
    category: "cosmetic",
    consumable: false,
  },
  {
    id: "badge_neon",
    name: "Neon Badge",
    description: "A glowing neon badge that stands out from the crowd.",
    price: 250,
    levelRequired: 5,
    icon: "sparkles-outline",
    iconColor: "#A855F7",
    iconBg: "rgba(168,85,247,0.12)",
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
    case "double_hints": {
      const cur6 = Number(await AsyncStorage.getItem(KEYS.hintTokens) || "0");
      await AsyncStorage.setItem(KEYS.hintTokens, String(cur6 + 6));
      break;
    }
    case "slow_speed":
      await AsyncStorage.setItem(KEYS.slowSpeed, "1");
      break;
    case "timer_freeze":
    case "auto_replay":
    case "phonetic_mode":
      await AsyncStorage.setItem(`lang:shop:${id}`, "1");
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
    case "pack_slang":
    case "pack_emergency":
    case "pack_romance":
    case "pack_social":
    case "pack_music":
    case "pack_sports":
    case "pack_medical":
    case "pack_tech":
      await AsyncStorage.setItem(`lang:shop:${id}`, "1");
      break;
    case "dark_theme":
      await AsyncStorage.setItem(KEYS.theme, "dark");
      break;
    case "sand_theme":
      await AsyncStorage.setItem(KEYS.theme, "sand");
      break;
    case "sunset_theme":
    case "nordic_theme":
    case "sakura_theme":
      await AsyncStorage.setItem(KEYS.theme, id.replace("_theme", ""));
      break;
    case "gold_orb":
      await AsyncStorage.setItem(KEYS.orb, "gold");
      break;
    case "midnight_orb":
      await AsyncStorage.setItem(KEYS.orb, "midnight");
      break;
    case "ocean_orb":
      await AsyncStorage.setItem(KEYS.orb, "ocean");
      break;
    case "forest_orb":
      await AsyncStorage.setItem(KEYS.orb, "forest");
      break;
    case "badge_polyglot":
      await AsyncStorage.setItem(KEYS.badge, "polyglot");
      break;
    case "badge_scholar":
      await AsyncStorage.setItem(KEYS.badge, "scholar");
      break;
    case "badge_explorer":
      await AsyncStorage.setItem(KEYS.badge, "explorer");
      break;
    case "badge_streak_master":
      await AsyncStorage.setItem(KEYS.badge, "streak_master");
      break;
    case "badge_neon":
      await AsyncStorage.setItem(KEYS.badge, "neon");
      break;
    case "coin_doubler":
      await AsyncStorage.setItem("lang:shop:coinDoubler", "1");
      break;
    case "xp_weekend":
    case "streak_shield":
    case "challenge_refresh":
      await AsyncStorage.setItem(`lang:shop:${id}`, "1");
      break;
    case "bonus_drop": {
      // Handled by caller — coins added separately
      break;
    }
    case "game_flappy_boat":
    case "game_memory_match":
    case "game_word_chase":
    case "game_listen_match":
      await AsyncStorage.setItem(`lang:shop:${id}`, "1");
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

// ── Game unlock helpers ──────────────────────────────────────────────────────

export type GameId = "game_flappy_boat" | "game_memory_match" | "game_word_chase" | "game_listen_match";

export async function isGameUnlocked(gameId: GameId): Promise<boolean> {
  return (await AsyncStorage.getItem(`lang:shop:${gameId}`)) === "1";
}

export const GAME_ROUTES: Record<GameId, string> = {
  game_flappy_boat: "/flappy",
  game_memory_match: "/memory-match",
  game_word_chase: "/word-chase",
  game_listen_match: "/listen-match",
};
