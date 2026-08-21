import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@intentui/core': path.resolve(__dirname, '../packages/core/src'),
      '@intentui/vue': path.resolve(__dirname, '../packages/vue/src'),
      '@intentui/ui-kit': path.resolve(__dirname, '../packages/ui-kit/src'),
      '@intentui/nuxt': path.resolve(__dirname, '../packages/nuxt/src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
