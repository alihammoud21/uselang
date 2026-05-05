export type PlatformId = "twitch" | "youtube" | "kick";
export type ScreenId =
  | "start"
  | "privacy"
  | "dashboard"
  | "shop"
  | "wardrobe"
  | "moderators"
  | "live"
  | "results"
  | "settings";

export type ItemCategory = "equipment" | "moderator" | "overlay" | "platform-skin";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  accent: string;
  description: string;
  viewerMultiplier: number;
  subscriberMultiplier: number;
  donationMultiplier: number;
  hypeDecay: number;
  trollPressure: number;
}

export interface GameItem {
  id: string;
  category: ItemCategory;
  name: string;
  cost: number;
  creditCost?: number;
  rarity: Rarity;
  description: string;
  bonus: string;
  modifiers: Partial<{
    startingHype: number;
    micHype: number;
    viewerGrowth: number;
    technicalStability: number;
    taskReward: number;
    trollReduction: number;
    chatMood: number;
    donationChance: number;
    subscriberBoost: number;
  }>;
}

export interface SaveState {
  version: 1;
  platform: PlatformId | null;
  subscribers: number;
  money: number;
  totalEarned: number;
  streamCredits: number;
  purchasedItems: string[];
  equippedOverlay: string | null;
  activeModerator: string | null;
  bestPeakViewers: number;
  milestonesReached: number[];
  settings: {
    volume: number;
    fullscreen: boolean;
    cameraEnabled: boolean;
    micEnabled: boolean;
    fallbackOnly: boolean;
  };
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  kind: "normal" | "hype" | "troll" | "donation" | "system";
}

export interface TaskPrompt {
  id: string;
  text: string;
  seconds: number;
}

export interface StreamStats {
  startedAt: number;
  endedAt: number;
  peakViewers: number;
  newSubscribers: number;
  moneyEarned: number;
  donationsReceived: number;
  tasksCompleted: number;
  bestMoment: string;
  chatMood: number;
}

export interface LiveState {
  startedAt: number;
  viewers: number;
  subscribers: number;
  money: number;
  hype: number;
  energy: number;
  chatMood: number;
  peakViewers: number;
  newSubscribers: number;
  moneyEarned: number;
  donationsReceived: number;
  tasksCompleted: number;
  bestMoment: string;
  currentTask: TaskPrompt;
  taskTimeLeft: number;
  chat: ChatMessage[];
  recentTaskBonus: number;
  lastAction: string;
}
