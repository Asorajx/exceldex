import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/* https://vite.dev/config/ */
export default defineConfig({
  plugins: [react()],
  /* Relative paths, so the built site works from any folder: a root domain (Vercel) or a */
  /* project path such as user.github.io/ExcelDex/ (GitHub Pages). There is no client-side routing. */
  base: './',
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    globals: false
  }
});
