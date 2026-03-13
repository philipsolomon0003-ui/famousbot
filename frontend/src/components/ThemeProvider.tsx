import React, { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = ['light', 'dark', 'midnight', 'hacker', 'sunset', 'rose', 'ocean'] as const;
export type Theme = typeof THEMES[number];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
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

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all previous theme variables
    root.classList.remove('light', 'dark', 'theme-midnight', 'theme-hacker', 'theme-sunset', 'theme-rose', 'theme-ocean');
    
    // Apply core dark mode base if it's a dark variant
    const isDark = ['dark', 'midnight', 'hacker', 'sunset'].includes(theme);
    if (isDark) {
      root.classList.add('dark');
    }

    // Add explicit theme class
    if (theme !== 'light' && theme !== 'dark') {
      root.classList.add(`theme-${theme}`);
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const idx = THEMES.indexOf(prev);
      return THEMES[(idx + 1) % THEMES.length];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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
