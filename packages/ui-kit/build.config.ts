import { defineBuildConfig } from 'unbuild';
import vue from 'unplugin-vue/rollup';

export default defineBuildConfig({
  entries: ['src/index'],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
  },
  hooks: {
    'rollup:options'(_ctx, options) {
      options.plugins = options.plugins || [];
      if (Array.isArray(options.plugins)) {
        options.plugins.unshift(vue({ isProduction: true }));
      }
    },
  },
  externals: ['vue', 'zod', '@intentui/core', '@intentui/vue'],
});
