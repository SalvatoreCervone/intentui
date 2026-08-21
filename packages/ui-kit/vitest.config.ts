import path from 'path';
import { defineConfig } from 'vitest/config';
import vue from 'unplugin-vue/vite';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@intentui/core': path.resolve(__dirname, '../core/src'),
      '@intentui/vue': path.resolve(__dirname, '../vue/src'),
    },
  },
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'happy-dom',
  },
});
