import type { PlatformConfig, PlatformId } from "./types";

export const platforms: Record<PlatformId, PlatformConfig> = {
  twitch: {
    id: "twitch",
    name: "Twitch",
    accent: "#9146ff",
    description: "Fast viewer spikes, bigger donation odds, louder chat, faster hype decay.",
    viewerMultiplier: 1.28,
    subscriberMultiplier: 0.92,
    donationMultiplier: 1.3,
    hypeDecay: 1.25,
    trollPressure: 1.1
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    accent: "#ff334e",
    description: "Slower live growth, stronger subscriber boosts, better viral moments.",
    viewerMultiplier: 0.95,
    subscriberMultiplier: 1.45,
    donationMultiplier: 0.95,
    hypeDecay: 0.85,
    trollPressure: 0.85
  },
  kick: {
    id: "kick",
    name: "Kick",
    accent: "#53fc18",
    description: "Explosive early growth, wild hype swings, more troll pressure.",
    viewerMultiplier: 1.18,
    subscriberMultiplier: 1.04,
    donationMultiplier: 1.08,
    hypeDecay: 1.1,
    trollPressure: 1.35
  }
};

export const platformList = Object.values(platforms);
