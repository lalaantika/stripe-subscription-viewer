/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // works for both frontend and backend-ish logic
    globals: true,
    include: [
      'web/src/**/*.test.ts?(x)',
      'amplify/functions/**/*.test.ts?(x)',
    ],
  },
});