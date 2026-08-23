import { defineBuildConfig } from "unbuild";
import vue from "unplugin-vue/rollup";
import fs from "node:fs";
import path from "node:path";

export default defineBuildConfig({
  entries: ["src/index"],
  clean: true,
  declaration: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true,
  },
  hooks: {
    "rollup:options"(_ctx, options) {
      options.plugins = options.plugins || [];
      if (Array.isArray(options.plugins)) {
        options.plugins.unshift(vue({ isProduction: true }));
      }
    },
    "build:done"(ctx) {
      const srcCss = path.resolve(ctx.options.rootDir, "src/styles.css");
      const distCss = path.resolve(ctx.options.rootDir, "dist/style.css");
      if (fs.existsSync(srcCss)) {
        fs.copyFileSync(srcCss, distCss);
      }
    },
  },
  externals: ["vue", "zod", "@intentui/core", "@intentui/vue"],
});
