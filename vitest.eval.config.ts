import { defineConfig } from 'vitest/config';

/* Used only by `npm run eval`. The normal `npm test` never runs these files. */
export default defineConfig({
  test: {
    include: ['eval/**/*.eval.ts'],
    environment: 'node'
  }
});
