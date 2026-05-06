// ── Postcard Pack Store ────────────────────────────────────────────────────────
// Pokémon-style postcard packs: buy → rip open → reveal cards one-by-one →
// keep in collection or sell for credits. 100% offline.

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ────────────────────────────────────────────────────────────────────

export type CardRarity = "common" | "uncommon" | "rare" | "legendary";

export interface PostcardCard {
  id: string;
  name: string;
  /** Target-language phrase printed on the card. */
  phrase: string;
  /** English meaning. */
  meaning: string;
  /** ISO language code. */
  lang: string;
  rarity: CardRarity;
  /** Visual accent color for the card border/glow. */
  color: string;
  /** Ionicons icon name for the card illustration. */
  icon: string;
  /** Sell value in spheres. */
  sellValue: number;
  /** Bonus XP awarded when the phrase is practiced. */
  xpBonus: number;
}

export interface PackDefinition {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Number of cards per pack. */
  cardCount: number;
  /** Weighted pool of card IDs this pack draws from. */
  pool: { cardId: string; weight: number }[];
  /** Accent color for the pack wrapper. */
  color: string;
  /** Secondary color for foil/gradient. */
  colorAlt: string;
  icon: string;
}

export interface OwnedCard {
  cardId: string;
  obtainedAt: number; // timestamp
  packId: string;     // which pack it came from
}

// ── Rarity config ────────────────────────────────────────────────────────────

export const RARITY_CONFIG: Record<CardRarity, { label: string; color: string; glow: string; sellMultiplier: number }> = {
  common:    { label: "Common",    color: "#9CA3AF", glow: "rgba(156,163,175,0.25)", sellMultiplier: 1 },
  uncommon:  { label: "Uncommon",  color: "#34D399", glow: "rgba(52,211,153,0.30)",  sellMultiplier: 2 },
  rare:      { label: "Rare",      color: "#60A5FA", glow: "rgba(96,165,250,0.35)",  sellMultiplier: 4 },
  legendary: { label: "Legendary", color: "#F59E0B", glow: "rgba(245,158,11,0.45)",  sellMultiplier: 10 },
};

// ── Card catalog ─────────────────────────────────────────────────────────────

export const CARD_CATALOG: PostcardCard[] = [
  // ── Mandarin cards ──
  { id: "zh_taxi",       name: "Hail a Taxi",     phrase: "师傅，去机场",         meaning: "Driver, to the airport",       lang: "zh", rarity: "common",    color: "#EF4444", icon: "car-outline",            sellValue: 10,  xpBonus: 10 },
  { id: "zh_wifi",       name: "WiFi Password",   phrase: "WiFi密码是什么？",     meaning: "What's the WiFi password?",    lang: "zh", rarity: "common",    color: "#3B82F6", icon: "wifi-outline",           sellValue: 10,  xpBonus: 10 },
  { id: "zh_spicy",      name: "No Spice!",       phrase: "不要辣的",             meaning: "Not spicy, please",            lang: "zh", rarity: "common",    color: "#F97316", icon: "flame-outline",          sellValue: 10,  xpBonus: 10 },
  { id: "zh_bargain",    name: "Bargain Hunter",  phrase: "可以便宜一点吗？",     meaning: "Can you make it cheaper?",     lang: "zh", rarity: "uncommon",  color: "#10B981", icon: "cash-outline",           sellValue: 20,  xpBonus: 15 },
  { id: "zh_lost",       name: "Lost Tourist",    phrase: "我迷路了",             meaning: "I'm lost",                    lang: "zh", rarity: "uncommon",  color: "#8B5CF6", icon: "compass-outline",        sellValue: 20,  xpBonus: 15 },
  { id: "zh_cheers",     name: "Cheers!",         phrase: "干杯！",               meaning: "Cheers! (bottoms up)",         lang: "zh", rarity: "uncommon",  color: "#D97706", icon: "beer-outline",           sellValue: 20,  xpBonus: 15 },
  { id: "zh_proverb",    name: "Water & Stone",   phrase: "滴水穿石",             meaning: "Dripping water pierces stone", lang: "zh", rarity: "rare",      color: "#06B6D4", icon: "water-outline",          sellValue: 40,  xpBonus: 25 },
  { id: "zh_kungfu",     name: "Kung Fu Time",    phrase: "功夫不负有心人",       meaning: "Hard work pays off",           lang: "zh", rarity: "rare",      color: "#DC2626", icon: "fitness-outline",        sellValue: 40,  xpBonus: 25 },
  { id: "zh_moongate",   name: "Moon Gate",       phrase: "月亮门",               meaning: "Moon Gate (garden arch)",      lang: "zh", rarity: "rare",      color: "#818CF8", icon: "moon-outline",           sellValue: 40,  xpBonus: 25 },
  { id: "zh_dragon",     name: "Dragon Spirit",   phrase: "龙马精神",             meaning: "Vigor of dragon & horse",      lang: "zh", rarity: "legendary", color: "#DC2626", icon: "flame-outline",          sellValue: 75,  xpBonus: 50 },
  // ── Spanish cards ──
  { id: "es_order",      name: "Order Like a Pro", phrase: "La cuenta, por favor", meaning: "The bill, please",           lang: "es", rarity: "common",    color: "#EF4444", icon: "receipt-outline",        sellValue: 10,  xpBonus: 10 },
  { id: "es_directions", name: "Street Savvy",    phrase: "¿Dónde está la estación?", meaning: "Where is the station?",  lang: "es", rarity: "common",    color: "#3B82F6", icon: "navigate-outline",       sellValue: 10,  xpBonus: 10 },
  { id: "es_party",      name: "Fiesta!",         phrase: "¡Vamos de fiesta!",    meaning: "Let's party!",                lang: "es", rarity: "common",    color: "#D946EF", icon: "musical-notes-outline",  sellValue: 10,  xpBonus: 10 },
  { id: "es_slang",      name: "Street Cred",     phrase: "¡Qué chido!",          meaning: "How cool! (slang)",           lang: "es", rarity: "uncommon",  color: "#F59E0B", icon: "sparkles-outline",       sellValue: 20,  xpBonus: 15 },
  { id: "es_remedy",     name: "Home Remedy",     phrase: "Tómate un té de manzanilla", meaning: "Drink chamomile tea",  lang: "es", rarity: "uncommon",  color: "#10B981", icon: "leaf-outline",           sellValue: 20,  xpBonus: 15 },
  { id: "es_sunset",     name: "Golden Hour",     phrase: "El atardecer es mágico", meaning: "The sunset is magical",    lang: "es", rarity: "uncommon",  color: "#F97316", icon: "sunny-outline",          sellValue: 20,  xpBonus: 15 },
  { id: "es_quixote",    name: "Don Quixote",     phrase: "En un lugar de la Mancha", meaning: "In a place in La Mancha", lang: "es", rarity: "rare",     color: "#6366F1", icon: "book-outline",           sellValue: 40,  xpBonus: 25 },
  { id: "es_corazon",    name: "Heart & Soul",    phrase: "Con todo mi corazón",  meaning: "With all my heart",           lang: "es", rarity: "rare",      color: "#EF4444", icon: "heart",                  sellValue: 40,  xpBonus: 25 },
  { id: "es_mariposa",   name: "Butterfly Effect", phrase: "El aleteo de una mariposa", meaning: "The flutter of a butterfly", lang: "es", rarity: "legendary", color: "#A855F7", icon: "leaf-outline",     sellValue: 75,  xpBonus: 50 },
  // ── French cards ──
  { id: "fr_cafe",       name: "Café Culture",    phrase: "Un café crème, s'il vous plaît", meaning: "A latte, please",  lang: "fr", rarity: "common",    color: "#D97706", icon: "cafe-outline",           sellValue: 10,  xpBonus: 10 },
  { id: "fr_metro",      name: "Metro Master",    phrase: "Quelle ligne pour Montmartre?", meaning: "Which line for Montmartre?", lang: "fr", rarity: "common", color: "#3B82F6", icon: "subway-outline",   sellValue: 10,  xpBonus: 10 },
  { id: "fr_market",     name: "Market Day",      phrase: "C'est combien le kilo?", meaning: "How much per kilo?",        lang: "fr", rarity: "common",    color: "#10B981", icon: "cart-outline",           sellValue: 10,  xpBonus: 10 },
  { id: "fr_verlan",     name: "Verlan Vibes",    phrase: "C'est ouf!",            meaning: "That's crazy! (verlan slang)", lang: "fr", rarity: "uncommon", color: "#EC4899", icon: "sparkles-outline",      sellValue: 20,  xpBonus: 15 },
  { id: "fr_wine",       name: "Wine Connoisseur", phrase: "Ce vin a du caractère", meaning: "This wine has character",   lang: "fr", rarity: "uncommon",  color: "#7C3AED", icon: "wine-outline",          sellValue: 20,  xpBonus: 15 },
  { id: "fr_art",        name: "Art Critic",      phrase: "C'est un chef-d'œuvre", meaning: "It's a masterpiece",         lang: "fr", rarity: "rare",      color: "#6366F1", icon: "color-palette-outline",  sellValue: 40,  xpBonus: 25 },
  { id: "fr_petitprince", name: "Le Petit Prince", phrase: "L'essentiel est invisible", meaning: "What's essential is invisible", lang: "fr", rarity: "rare", color: "#F59E0B", icon: "star-outline",      sellValue: 40,  xpBonus: 25 },
  { id: "fr_clair",      name: "Clair de Lune",   phrase: "Clair de lune",         meaning: "Moonlight",                  lang: "fr", rarity: "legendary", color: "#818CF8", icon: "moon-outline",           sellValue: 75,  xpBonus: 50 },
];

const CARD_MAP = new Map(CARD_CATALOG.map((c) => [c.id, c]));
export function getCard(id: string): PostcardCard | undefined {
  return CARD_MAP.get(id);
}

// ── Pack definitions ─────────────────────────────────────────────────────────

function buildPool(lang: string): { cardId: string; weight: number }[] {
  return CARD_CATALOG.filter((c) => c.lang === lang).map((c) => ({
    cardId: c.id,
    weight: c.rarity === "common" ? 40 : c.rarity === "uncommon" ? 25 : c.rarity === "rare" ? 10 : 3,
  }));
}

export const PACK_CATALOG: PackDefinition[] = [
  {
    id: "pack_mandarin",
    name: "Mandarin Pack",
    description: "5 Mandarin phrase postcards. Contains common to legendary cards.",
    price: 300,
    cardCount: 5,
    pool: buildPool("zh"),
    color: "#DC2626",
    colorAlt: "#F97316",
    icon: "language-outline",
  },
  {
    id: "pack_spanish",
    name: "Spanish Pack",
    description: "5 Spanish phrase postcards. ¡Vamos!",
    price: 300,
    cardCount: 5,
    pool: buildPool("es"),
    color: "#F59E0B",
    colorAlt: "#EF4444",
    icon: "sunny-outline",
  },
  {
    id: "pack_french",
    name: "French Pack",
    description: "5 French phrase postcards. Magnifique!",
    price: 300,
    cardCount: 5,
    pool: buildPool("fr"),
    color: "#3B82F6",
    colorAlt: "#818CF8",
    icon: "cafe-outline",
  },
  {
    id: "pack_mixed",
    name: "World Pack",
    description: "5 random cards from all languages. Higher legendary chance!",
    price: 300,
    cardCount: 5,
    pool: [
      ...buildPool("zh").map((p) => ({ ...p, weight: Math.round(p.weight * 0.8) })),
      ...buildPool("es").map((p) => ({ ...p, weight: Math.round(p.weight * 0.8) })),
      ...buildPool("fr").map((p) => ({ ...p, weight: Math.round(p.weight * 0.8) })),
    ],
    color: "#7C3AED",
    colorAlt: "#EC4899",
    icon: "globe-outline",
  },
];

// ── Draw cards from a pack ──────────────────────────────────────────────────

export function drawCardsFromPack(pack: PackDefinition): PostcardCard[] {
  const drawn: PostcardCard[] = [];
  const totalWeight = pack.pool.reduce((sum, p) => sum + p.weight, 0);

  for (let i = 0; i < pack.cardCount; i++) {
    let roll = Math.random() * totalWeight;
    let picked = pack.pool[0];
    for (const entry of pack.pool) {
      roll -= entry.weight;
      if (roll <= 0) { picked = entry; break; }
    }
    const card = getCard(picked.cardId);
    if (card) drawn.push(card);
  }

  // Sort: legendary last (the big reveal)
  const order: Record<CardRarity, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
  drawn.sort((a, b) => order[a.rarity] - order[b.rarity]);

  return drawn;
}

// ── Collection persistence ──────────────────────────────────────────────────

const COLL_KEY = "lang:postcards:collection";
const PACKS_OPENED_KEY = "lang:postcards:packsOpened";

async function readCollection(): Promise<OwnedCard[]> {
  try {
    const raw = await AsyncStorage.getItem(COLL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function writeCollection(coll: OwnedCard[]): Promise<void> {
  await AsyncStorage.setItem(COLL_KEY, JSON.stringify(coll));
}

export async function getCollection(): Promise<OwnedCard[]> {
  return readCollection();
}

export async function addCardsToCollection(cards: PostcardCard[], packId: string): Promise<void> {
  const coll = await readCollection();
  const now = Date.now();
  for (const card of cards) {
    coll.push({ cardId: card.id, obtainedAt: now, packId });
  }
  await writeCollection(coll);
}

export async function sellCard(cardId: string): Promise<number> {
  const coll = await readCollection();
  const idx = coll.findIndex((c) => c.cardId === cardId);
  if (idx === -1) return 0;
  const card = getCard(coll[idx].cardId);
  coll.splice(idx, 1);
  await writeCollection(coll);
  return card?.sellValue ?? 0;
}

export async function getPacksOpened(): Promise<number> {
  return Number(await AsyncStorage.getItem(PACKS_OPENED_KEY) || "0");
}

export async function incrementPacksOpened(): Promise<void> {
  const n = await getPacksOpened();
  await AsyncStorage.setItem(PACKS_OPENED_KEY, String(n + 1));
}

/** Count how many unique cards the user has collected. */
export async function getUniqueCardCount(): Promise<number> {
  const coll = await readCollection();
  return new Set(coll.map((c) => c.cardId)).size;
}

/** Total card count. */
export async function getTotalCardCount(): Promise<number> {
  return (await readCollection()).length;
}
