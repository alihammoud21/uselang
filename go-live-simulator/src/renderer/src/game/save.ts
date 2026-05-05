import type { SaveState } from "./types";

const SAVE_KEY = "go-live-simulator-save-v1";

export const defaultSave: SaveState = {
  version: 1,
  platform: null,
  subscribers: 0,
  money: 250,
  totalEarned: 0,
  streamCredits: 25,
  purchasedItems: [],
  equippedOverlay: null,
  activeModerator: null,
  bestPeakViewers: 0,
  milestonesReached: [],
  settings: {
    volume: 0.7,
    fullscreen: false,
    cameraEnabled: false,
    micEnabled: false,
    fallbackOnly: false
  }
};

export function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave;
    const parsed = JSON.parse(raw) as SaveState;
    if (parsed.version !== 1) return defaultSave;
    return { ...defaultSave, ...parsed, settings: { ...defaultSave.settings, ...parsed.settings } };
  } catch {
    return defaultSave;
  }
}

export function storeSave(save: SaveState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function clearSave(): SaveState {
  localStorage.removeItem(SAVE_KEY);
  return defaultSave;
}

export const milestones = [100, 1_000, 10_000, 100_000, 500_000, 1_000_000];

export function nextMilestone(subscribers: number): number {
  return milestones.find((milestone) => subscribers < milestone) ?? 1_000_000;
}
