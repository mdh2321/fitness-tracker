'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  accentColor: '#00d26a',
  setAccentColor: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyAccent(color: string) {
  document.documentElement.style.setProperty('--accent', color);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [accentColor, setAccentState] = useState('#00d26a');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((settings) => {
        const saved = settings?.theme === 'light' ? 'light' : 'dark';
        setThemeState(saved);
        if (saved === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }

        const accent = settings?.accent_color || '#00d26a';
        setAccentState(accent);
        applyAccent(accent);
      })
      .catch(() => {});
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (newTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  };

  const setAccentColor = (color: string) => {
    setAccentState(color);
    applyAccent(color);
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accent_color: color }),
    }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
