import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type SidebarVariant = 'inset' | 'floating' | 'sidebar';
export type SidebarCollapsible = 'icon' | 'offcanvas' | 'none';
export type Direction = 'ltr' | 'rtl';
export type FontFamily = 'noto-sans' | 'lxgw-wenkai' | 'noto-serif' | 'system';
export type ColorScheme = 'slate' | 'amethyst' | 'rose' | 'claude' | 'emerald';

interface ThemeContextProps {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  variant: SidebarVariant;
  setVariant: (variant: SidebarVariant) => void;
  collapsible: SidebarCollapsible;
  setCollapsible: (collapsible: SidebarCollapsible) => void;
  dir: Direction;
  setDir: (dir: Direction) => void;
  font: FontFamily;
  setFont: (font: FontFamily) => void;
  resetConfig: () => void;
}

const DEFAULT_THEME: Theme = 'system';
const DEFAULT_COLOR_SCHEME: ColorScheme = 'slate';
const DEFAULT_VARIANT: SidebarVariant = 'inset';
const DEFAULT_COLLAPSIBLE: SidebarCollapsible = 'icon';
const DEFAULT_DIR: Direction = 'ltr';
const DEFAULT_FONT: FontFamily = 'noto-sans';

const ThemeContext = createContext<ThemeContextProps>({
  theme: DEFAULT_THEME,
  resolvedTheme: 'light',
  setTheme: () => null,
  colorScheme: DEFAULT_COLOR_SCHEME,
  setColorScheme: () => null,
  variant: DEFAULT_VARIANT,
  setVariant: () => null,
  collapsible: DEFAULT_COLLAPSIBLE,
  setCollapsible: () => null,
  dir: DEFAULT_DIR,
  setDir: () => null,
  font: DEFAULT_FONT,
  setFont: () => null,
  resetConfig: () => null,
});

const STORAGE_KEY = 'innerecho-admin-theme';
const COLOR_SCHEME_STORAGE_KEY = 'innerecho-admin-color-scheme';
const VARIANT_STORAGE_KEY = 'innerecho-admin-sidebar-variant';
const COLLAPSIBLE_STORAGE_KEY = 'innerecho-admin-sidebar-collapsible';
const DIR_STORAGE_KEY = 'innerecho-admin-direction';
const FONT_STORAGE_KEY = 'innerecho-admin-font';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return saved === 'dark' || saved === 'light' || saved === 'system' ? saved : DEFAULT_THEME;
  });

  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    const saved = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY) as ColorScheme | null;
    return saved === 'slate' ||
      saved === 'amethyst' ||
      saved === 'rose' ||
      saved === 'claude' ||
      saved === 'emerald'
      ? saved
      : DEFAULT_COLOR_SCHEME;
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

  const [font, setFont] = useState<FontFamily>(() => {
    const saved = localStorage.getItem(FONT_STORAGE_KEY) as FontFamily | null;
    return saved === 'noto-sans' ||
      saved === 'lxgw-wenkai' ||
      saved === 'noto-serif' ||
      saved === 'system'
      ? saved
      : DEFAULT_FONT;
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
    if (colorScheme === 'slate') {
      delete document.documentElement.dataset.colorScheme;
    } else {
      document.documentElement.dataset.colorScheme = colorScheme;
    }
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, colorScheme);
  }, [colorScheme]);

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

  useEffect(() => {
    document.documentElement.dataset.font = font;
    localStorage.setItem(FONT_STORAGE_KEY, font);
  }, [font]);

  const resetConfig = useCallback(() => {
    setTheme(DEFAULT_THEME);
    setColorScheme(DEFAULT_COLOR_SCHEME);
    setVariant(DEFAULT_VARIANT);
    setCollapsible(DEFAULT_COLLAPSIBLE);
    setDir(DEFAULT_DIR);
    setFont(DEFAULT_FONT);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        colorScheme,
        setColorScheme,
        variant,
        setVariant,
        collapsible,
        setCollapsible,
        dir,
        setDir,
        font,
        setFont,
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
