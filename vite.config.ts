import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/* https://vite.dev/config/ */
export default defineConfig({
  plugins: [react()],
  /* Relative asset paths, so the built site can be served from any folder. */
  base: './',
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    globals: false
  }
});
