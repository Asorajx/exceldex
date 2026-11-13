import { useEffect, useState } from 'react';

/* =========================
   Theme
   ========================= */

export type Theme = 'light' | 'dark';

/* Must match the key read by the inline script in index.html. */
const STORAGE_KEY = 'exceldex-theme';

function systemTheme(): Theme {
  const dark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return dark ? 'dark' : 'light';
}

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null; /* storage can be blocked (private mode); just follow the system */
  }
}

/* Light/dark theme. Starts from the saved choice, or the system setting if there is none. */
/* Only an explicit toggle is saved, so people who never touch it keep following their system. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => savedTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Not saved, but the toggle still works for this visit. */
    }
  }

  return { theme, toggle };
}
