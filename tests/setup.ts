import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/* Vitest globals are off, so Testing Library's auto-cleanup must be registered by hand. */
afterEach(() => {
  cleanup();
  /* The theme lives on <html> and in localStorage, so reset both between tests. */
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});
