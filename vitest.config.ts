import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['@testing-library/jest-dom/vitest'],
    alias: {
      'next/server': path.resolve(__dirname, 'src/__mocks__/next-server.ts'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
