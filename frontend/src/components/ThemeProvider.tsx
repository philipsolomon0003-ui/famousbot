import React, { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = ['light', 'dark', 'midnight', 'hacker', 'sunset', 'rose', 'ocean', 'amethyst', 'forest', 'candy', 'cyberpunk', 'crimson'] as const;
export type Theme = typeof THEMES[number];

export const FONTS = ['inter', 'roboto', 'poppins', 'mono', 'outfit', 'playfair', 'space', 'quicksand'] as const;
export type Font = typeof FONTS[number];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  font: Font;
  toggleFont: () => void;
  setFont: (f: Font) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check local storage or system preference on initial load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && THEMES.includes(savedTheme as Theme)) {
      return savedTheme as Theme;
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [font, setFontState] = useState<Font>(() => {
    const savedFont = localStorage.getItem('font');
    if (savedFont && FONTS.includes(savedFont as Font)) {
      return savedFont as Font;
    }
    return 'inter';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all previous theme variables
    root.classList.remove('light', 'dark', 'theme-midnight', 'theme-hacker', 'theme-sunset', 'theme-rose', 'theme-ocean', 'theme-amethyst', 'theme-forest', 'theme-candy', 'theme-cyberpunk', 'theme-crimson');
    
    // Apply core dark mode base if it's a dark variant
    const isDark = ['dark', 'midnight', 'hacker', 'sunset', 'amethyst', 'forest', 'cyberpunk', 'crimson'].includes(theme);
    if (isDark) {
      root.classList.add('dark');
    }

    // Add explicit theme class
    if (theme !== 'light' && theme !== 'dark') {
      root.classList.add(`theme-${theme}`);
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle Font logic
  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all previous font classes
    root.classList.remove('font-inter', 'font-roboto', 'font-poppins', 'font-mono', 'font-outfit', 'font-playfair', 'font-space', 'font-quicksand');
    
    // Add explicitly chosen font
    root.classList.add(`font-${font}`);
    localStorage.setItem('font', font);
  }, [font]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const idx = THEMES.indexOf(prev);
      return THEMES[(idx + 1) % THEMES.length];
    });
  };

  const toggleFont = () => {
    setFontState((prev) => {
      const idx = FONTS.indexOf(prev);
      return FONTS[(idx + 1) % FONTS.length];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, font, toggleFont, setFont: setFontState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
