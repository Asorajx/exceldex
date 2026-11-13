import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

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
    return null; /* storage unavailable: follow the system theme */
  }
}

export type WipeOrigin = { x: number; y: number };

/* True when the browser supports view transitions and reduced motion is not requested. */
function canWipe() {
  return (
    typeof document.startViewTransition === 'function' &&
    !(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
}

/* Light/dark theme. Starts from the saved choice, or the system setting if there is none. */
/* Only an explicit toggle is saved, so people who never touch it keep following their system. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => savedTheme() ?? systemTheme());

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    /* Removes .theme-switching after two frames. */
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  /* origin: the point the wipe circle grows from. */
  function toggle(origin?: WipeOrigin) {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    const apply = () => {
      root.dataset.theme = next;
      setTheme(next);
    };

    if (canWipe()) {
      const { x, y } = origin ?? { x: window.innerWidth / 2, y: 0 };
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      /* The callback must update the page synchronously, so the state update is wrapped in flushSync. */
      const transition = document.startViewTransition(() => flushSync(apply));
      transition.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 280, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
        );
      }, () => {});
    } else {
      /* Fallback: change the theme with colour transitions disabled. */
      root.classList.add('theme-switching');
      apply();
    }
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Not saved, but the toggle still works for this visit. */
    }
  }

  return { theme, toggle };
}
