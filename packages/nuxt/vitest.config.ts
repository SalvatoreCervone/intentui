import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@intentui-vue/core': path.resolve(__dirname, '../core/src'),
      '@intentui-vue/vue': path.resolve(__dirname, '../vue/src'),
    },
  },
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
