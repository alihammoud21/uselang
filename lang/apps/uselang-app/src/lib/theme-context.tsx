// ── Theme Context ─────────────────────────────────────────────────────────────
// Provides the active theme palette to the whole app via React Context.
// Wrap the root layout with <ThemeProvider> and consume with useAppTheme().

import React, { createContext, useContext, useEffect, useState } from "react";
import { getSavedTheme, getThemePalette, setSavedTheme, type ThemeId, type ThemePalette, THEMES } from "./theme-store";

interface ThemeContextValue {
  theme: ThemePalette;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => Promise<void>;
}

const DEFAULT_PALETTE = THEMES.paper;

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_PALETTE,
  themeId: "paper",
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>("paper");
  const [theme, setThemePalette] = useState<ThemePalette>(DEFAULT_PALETTE);

  useEffect(() => {
    getSavedTheme().then((id) => {
      setThemeId(id);
      setThemePalette(getThemePalette(id));
    });
  }, []);

  const setTheme = async (id: ThemeId) => {
    await setSavedTheme(id);
    setThemeId(id);
    setThemePalette(getThemePalette(id));
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
