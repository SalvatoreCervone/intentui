import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@intentui/core': path.resolve(__dirname, '../core/src'),
    },
  },
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'happy-dom',
  },
});
