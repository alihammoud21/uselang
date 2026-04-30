// ── Theme Store ──────────────────────────────────────────────────────────────
// Persists the user's selected theme. Provides token palettes for each theme.

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "lang:theme";

// ── Theme identifiers ───────────────────────────────────────────────────────

export type ThemeId = "paper" | "midnight" | "dune" | "forest" | "ocean";

// ── Token palette ───────────────────────────────────────────────────────────

export interface ThemePalette {
  id: ThemeId;
  label: string;
  bg: string;
  card: string;
  surface: string;
  ink: string;
  inkSub: string;
  muted: string;
  accent: string;
  accentSoft: string;
  border: string;
  success: string;
  danger: string;
  isDark: boolean;
}

// ── Palettes ────────────────────────────────────────────────────────────────

export const THEMES: Record<ThemeId, ThemePalette> = {
  paper: {
    id: "paper",
    label: "Paper",
    bg: "#F5EFE2",
    card: "#FBF6EA",
    surface: "#FFFFFF",
    ink: "#1C1714",
    inkSub: "#5C4F40",
    muted: "#7A6E5F",
    accent: "#7A4A22",
    accentSoft: "rgba(122,74,34,0.09)",
    border: "rgba(60,40,20,0.08)",
    success: "#22C55E",
    danger: "#EF4444",
    isDark: false,
  },
  midnight: {
    id: "midnight",
    label: "Midnight",
    bg: "#0F0F14",
    card: "#1A1A22",
    surface: "#22222C",
    ink: "#E8E6E0",
    inkSub: "#A0A0A8",
    muted: "#606068",
    accent: "#8B9CF7",
    accentSoft: "rgba(139,156,247,0.12)",
    border: "rgba(255,255,255,0.06)",
    success: "#34D399",
    danger: "#F87171",
    isDark: true,
  },
  dune: {
    id: "dune",
    label: "Dune",
    bg: "#2A2018",
    card: "#3A2E22",
    surface: "#4A3E30",
    ink: "#F0E6D6",
    inkSub: "#C4B8A0",
    muted: "#8A7E6A",
    accent: "#D4A050",
    accentSoft: "rgba(212,160,80,0.14)",
    border: "rgba(255,230,180,0.08)",
    success: "#5CB85C",
    danger: "#E8644A",
    isDark: true,
  },
  forest: {
    id: "forest",
    label: "Forest",
    bg: "#141E18",
    card: "#1C2A20",
    surface: "#243428",
    ink: "#E0EAE2",
    inkSub: "#96B0A0",
    muted: "#5A7A66",
    accent: "#5CAA6A",
    accentSoft: "rgba(92,170,106,0.14)",
    border: "rgba(200,240,200,0.06)",
    success: "#6ECF80",
    danger: "#E86060",
    isDark: true,
  },
  ocean: {
    id: "ocean",
    label: "Ocean",
    bg: "#0E1A24",
    card: "#162430",
    surface: "#1E2E3C",
    ink: "#DCE8F0",
    inkSub: "#8EAAC0",
    muted: "#4A6A82",
    accent: "#3B8FD4",
    accentSoft: "rgba(59,143,212,0.14)",
    border: "rgba(180,220,255,0.06)",
    success: "#34D399",
    danger: "#F87171",
    isDark: true,
  },
};

export const THEME_IDS: ThemeId[] = ["paper", "midnight", "dune", "forest", "ocean"];

// ── Persistence ─────────────────────────────────────────────────────────────

export async function getSavedTheme(): Promise<ThemeId> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    if (val && val in THEMES) return val as ThemeId;
    return "paper";
  } catch {
    return "paper";
  }
}

export async function setSavedTheme(id: ThemeId): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, id);
}

export function getThemePalette(id: ThemeId): ThemePalette {
  return THEMES[id];
}
