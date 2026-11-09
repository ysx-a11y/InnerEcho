import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type SidebarVariant = 'inset' | 'floating' | 'sidebar';
export type SidebarCollapsible = 'icon' | 'offcanvas' | 'none';
export type Direction = 'ltr' | 'rtl';

interface ThemeContextProps {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
  variant: SidebarVariant;
  setVariant: (variant: SidebarVariant) => void;
  collapsible: SidebarCollapsible;
  setCollapsible: (collapsible: SidebarCollapsible) => void;
  dir: Direction;
  setDir: (dir: Direction) => void;
  resetConfig: () => void;
}

const DEFAULT_THEME: Theme = 'system';
const DEFAULT_VARIANT: SidebarVariant = 'inset';
const DEFAULT_COLLAPSIBLE: SidebarCollapsible = 'icon';
const DEFAULT_DIR: Direction = 'ltr';

const ThemeContext = createContext<ThemeContextProps>({
  theme: DEFAULT_THEME,
  resolvedTheme: 'light',
  setTheme: () => null,
  variant: DEFAULT_VARIANT,
  setVariant: () => null,
  collapsible: DEFAULT_COLLAPSIBLE,
  setCollapsible: () => null,
  dir: DEFAULT_DIR,
  setDir: () => null,
  resetConfig: () => null,
});

const STORAGE_KEY = 'innerecho-admin-theme';
const VARIANT_STORAGE_KEY = 'innerecho-admin-sidebar-variant';
const COLLAPSIBLE_STORAGE_KEY = 'innerecho-admin-sidebar-collapsible';
const DIR_STORAGE_KEY = 'innerecho-admin-direction';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return saved === 'dark' || saved === 'light' || saved === 'system' ? saved : DEFAULT_THEME;
  });

  const [variant, setVariant] = useState<SidebarVariant>(() => {
    const saved = localStorage.getItem(VARIANT_STORAGE_KEY) as SidebarVariant | null;
    return saved === 'inset' || saved === 'floating' || saved === 'sidebar'
      ? saved
      : DEFAULT_VARIANT;
  });

  const [collapsible, setCollapsible] = useState<SidebarCollapsible>(() => {
    const saved = localStorage.getItem(COLLAPSIBLE_STORAGE_KEY) as SidebarCollapsible | null;
    return saved === 'icon' || saved === 'offcanvas' || saved === 'none'
      ? saved
      : DEFAULT_COLLAPSIBLE;
  });

  const [dir, setDir] = useState<Direction>(() => {
    const saved = localStorage.getItem(DIR_STORAGE_KEY) as Direction | null;
    return saved === 'ltr' || saved === 'rtl' ? saved : DEFAULT_DIR;
  });

  const resolvedTheme = useMemo<'dark' | 'light'>(() => {
    if (theme === 'system') {
      return typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return theme;
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    localStorage.setItem(VARIANT_STORAGE_KEY, variant);
  }, [variant]);

  useEffect(() => {
    localStorage.setItem(COLLAPSIBLE_STORAGE_KEY, collapsible);
  }, [collapsible]);

  useEffect(() => {
    document.documentElement.dir = dir;
    localStorage.setItem(DIR_STORAGE_KEY, dir);
  }, [dir]);

  const resetConfig = useCallback(() => {
    setTheme(DEFAULT_THEME);
    setVariant(DEFAULT_VARIANT);
    setCollapsible(DEFAULT_COLLAPSIBLE);
    setDir(DEFAULT_DIR);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        variant,
        setVariant,
        collapsible,
        setCollapsible,
        dir,
        setDir,
        resetConfig,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}

