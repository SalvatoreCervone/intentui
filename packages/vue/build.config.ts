import { defineBuildConfig } from 'unbuild';
import fs from 'node:fs';
import path from 'node:path';

export default defineBuildConfig({
  entries: ['src/index'],
  clean: true,
  declaration: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true,
  },
  hooks: {
    'build:done'(ctx) {
      const srcCss = path.resolve(ctx.options.rootDir, '../ui-kit/src/styles.css');
      const distCss = path.resolve(ctx.options.rootDir, 'dist/style.css');
      if (fs.existsSync(srcCss)) {
        fs.copyFileSync(srcCss, distCss);
      }
    },
  },
  externals: ['vue', 'zod', '@intentui-vue/core', '@intentui-vue/ui-kit'],
});
