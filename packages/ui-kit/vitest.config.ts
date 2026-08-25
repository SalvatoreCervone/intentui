import path from 'path';
import { defineConfig } from 'vitest/config';
import vue from 'unplugin-vue/vite';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@intentui-vue/core': path.resolve(__dirname, '../core/src'),
      '@intentui-vue/vue': path.resolve(__dirname, '../vue/src'),
      '@intentui-vue/ui-kit': path.resolve(__dirname, '../ui-kit/src'),
    },
  },
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'happy-dom',
  },
});
