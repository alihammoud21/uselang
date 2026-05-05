import { items } from "./items";
import type { GameItem, Rarity, SaveState } from "./types";

export interface PackDefinition {
  id: string;
  name: string;
  cost: number;
  creditCost: number;
  description: string;
  rolls: number;
}

export interface PackReward {
  id: string;
  label: string;
  rarity: Rarity;
  kind: "item" | "money" | "credits";
  item?: GameItem;
  amount?: number;
}

export const packs: PackDefinition[] = [
  {
    id: "starter-stream-pack",
    name: "Starter Stream Pack",
    cost: 220,
    creditCost: 18,
    description: "Three pulls with common gear, overlays, and a rare chance.",
    rolls: 3
  },
  {
    id: "platform-hype-pack",
    name: "Platform Hype Pack",
    cost: 520,
    creditCost: 42,
    description: "Four pulls with boosted odds for platform skins and moderators.",
    rolls: 4
  },
  {
    id: "legendary-creator-pack",
    name: "Legendary Creator Pack",
    cost: 1150,
    creditCost: 85,
    description: "Five pulls, guaranteed rare or better final pull.",
    rolls: 5
  }
];

const rarityWeights: Record<Rarity, number> = {
  common: 58,
  rare: 28,
  epic: 11,
  legendary: 3
};

function pickRarity(forceRareOrBetter = false): Rarity {
  const roll = Math.random() * (forceRareOrBetter ? 42 : 100);
  const entries = (Object.entries(rarityWeights) as [Rarity, number][]).filter(([rarity]) => {
    return !forceRareOrBetter || rarity !== "common";
  });
  let cursor = 0;
  for (const [rarity, weight] of entries) {
    cursor += weight;
    if (roll <= cursor) return rarity;
  }
  return forceRareOrBetter ? "rare" : "common";
}

export function openPack(pack: PackDefinition, save: SaveState): { save: SaveState; rewards: PackReward[] } {
  const rewards: PackReward[] = [];
  const nextSave: SaveState = { ...save, purchasedItems: [...save.purchasedItems] };

  for (let index = 0; index < pack.rolls; index += 1) {
    const rarity = pickRarity(pack.id === "legendary-creator-pack" && index === pack.rolls - 1);
    const pool = items.filter((item) => item.rarity === rarity && !nextSave.purchasedItems.includes(item.id));
    const currencyRoll = Math.random();

    if (pool.length > 0 && currencyRoll > 0.22) {
      const item = pool[Math.floor(Math.random() * pool.length)];
      nextSave.purchasedItems.push(item.id);
      rewards.push({ id: `${pack.id}-${index}-${item.id}`, label: item.name, rarity, kind: "item", item });
    } else if (currencyRoll > 0.68) {
      const amount = rarity === "legendary" ? 90 : rarity === "epic" ? 55 : rarity === "rare" ? 30 : 12;
      nextSave.streamCredits += amount;
      rewards.push({ id: `${pack.id}-${index}-credits`, label: `${amount} Stream Credits`, rarity, kind: "credits", amount });
    } else {
      const amount = rarity === "legendary" ? 600 : rarity === "epic" ? 340 : rarity === "rare" ? 170 : 80;
      nextSave.money += amount;
      rewards.push({ id: `${pack.id}-${index}-money`, label: `$${amount}`, rarity, kind: "money", amount });
    }
  }

  return { save: nextSave, rewards };
}
