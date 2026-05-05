import type { GameItem } from "./types";

export const items: GameItem[] = [
  {
    id: "better-webcam-frame",
    category: "equipment",
    name: "Better Webcam Frame",
    cost: 180,
    rarity: "common",
    description: "A cleaner frame makes the stream feel more professional.",
    bonus: "+6 starting hype",
    modifiers: { startingHype: 6 }
  },
  {
    id: "better-microphone",
    category: "equipment",
    name: "Better Microphone",
    cost: 260,
    rarity: "rare",
    description: "Chat hears every fake pop-off clearly.",
    bonus: "+20% talk and mic hype",
    modifiers: { micHype: 0.2 }
  },
  {
    id: "rgb-lights",
    category: "equipment",
    name: "RGB Lights",
    cost: 360,
    rarity: "rare",
    description: "A colorful setup helps viewers stick around.",
    bonus: "+12% viewer growth",
    modifiers: { viewerGrowth: 0.12 }
  },
  {
    id: "faster-internet",
    category: "equipment",
    name: "Faster Internet",
    cost: 420,
    rarity: "epic",
    description: "Reduces lag and camera glitch events.",
    bonus: "+25% technical stability",
    modifiers: { technicalStability: 0.25 }
  },
  {
    id: "stream-deck",
    category: "equipment",
    name: "Stream Deck",
    cost: 520,
    rarity: "epic",
    description: "Big moments trigger cleaner scenes and alerts.",
    bonus: "+18% task rewards",
    modifiers: { taskReward: 0.18 }
  },
  {
    id: "basic-bot-mod",
    category: "moderator",
    name: "Basic Bot Mod",
    cost: 160,
    rarity: "common",
    description: "Keeps the worst spam out of chat.",
    bonus: "Slightly reduces trolls",
    modifiers: { trollReduction: 0.12 }
  },
  {
    id: "chill-human-mod",
    category: "moderator",
    name: "Chill Human Mod",
    cost: 320,
    rarity: "rare",
    description: "A calm presence that keeps chat readable.",
    bonus: "+10 chat mood",
    modifiers: { trollReduction: 0.2, chatMood: 10 }
  },
  {
    id: "pro-moderator",
    category: "moderator",
    name: "Pro Moderator",
    cost: 720,
    rarity: "epic",
    description: "Handles waves of trolls and spots donors fast.",
    bonus: "Fewer trolls, better donation odds",
    modifiers: { trollReduction: 0.4, chatMood: 16, donationChance: 0.15 }
  },
  {
    id: "celebrity-mod",
    category: "moderator",
    name: "Celebrity Mod",
    cost: 1500,
    creditCost: 120,
    rarity: "legendary",
    description: "Occasionally turns moderation into an event.",
    bonus: "Major hype event chance",
    modifiers: { trollReduction: 0.5, chatMood: 22, donationChance: 0.22, subscriberBoost: 0.1 }
  },
  {
    id: "sunglasses-badge",
    category: "overlay",
    name: "Sunglasses Badge",
    cost: 120,
    rarity: "common",
    description: "A small badge pinned to the webcam corner.",
    bonus: "+3 starting hype",
    modifiers: { startingHype: 3 }
  },
  {
    id: "cat-ears-badge",
    category: "overlay",
    name: "Cat Ears Badge",
    cost: 190,
    rarity: "common",
    description: "A playful badge overlay. It does not dress the player.",
    bonus: "+5 chat mood",
    modifiers: { chatMood: 5 }
  },
  {
    id: "neon-border",
    category: "overlay",
    name: "Neon Border",
    cost: 340,
    rarity: "rare",
    description: "A bright animated border around the local camera feed.",
    bonus: "+8% viewer growth",
    modifiers: { viewerGrowth: 0.08 }
  },
  {
    id: "fire-border",
    category: "overlay",
    name: "Fire Border",
    cost: 540,
    rarity: "epic",
    description: "Animated heat around big reactions.",
    bonus: "+14% task rewards",
    modifiers: { taskReward: 0.14 }
  },
  {
    id: "golden-streamer-frame",
    category: "overlay",
    name: "Golden Streamer Frame",
    cost: 1200,
    creditCost: 90,
    rarity: "legendary",
    description: "A premium frame for milestone chasers.",
    bonus: "+12% subscribers",
    modifiers: { subscriberBoost: 0.12, startingHype: 10 }
  },
  {
    id: "twitch-stream-skin",
    category: "platform-skin",
    name: "Twitch Stream Skin",
    cost: 450,
    rarity: "rare",
    description: "Purple stream scene styling for the live screen.",
    bonus: "+8% donations on Twitch",
    modifiers: { donationChance: 0.08 }
  },
  {
    id: "youtube-stream-skin",
    category: "platform-skin",
    name: "YouTube Stream Skin",
    cost: 450,
    rarity: "rare",
    description: "Red stream scene styling for the live screen.",
    bonus: "+8% subscribers on YouTube",
    modifiers: { subscriberBoost: 0.08 }
  },
  {
    id: "kick-stream-skin",
    category: "platform-skin",
    name: "Kick Stream Skin",
    cost: 450,
    rarity: "rare",
    description: "Green stream scene styling for the live screen.",
    bonus: "+8% viewer growth on Kick",
    modifiers: { viewerGrowth: 0.08 }
  }
];

export function findItem(id: string | null | undefined): GameItem | undefined {
  return items.find((item) => item.id === id);
}

export function ownedItems(ids: string[]): GameItem[] {
  return items.filter((item) => ids.includes(item.id));
}
