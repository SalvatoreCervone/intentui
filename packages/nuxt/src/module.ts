import type { NuxtModule } from '@nuxt/schema';
import {
  defineNuxtModule,
  addComponent,
  addImports,
  createResolver,
  addServerHandler,
} from '@nuxt/kit';

/**
 * Configuration options for the @intentui/nuxt module.
 */
export interface ModuleOptions {
  /**
   * Relative path to the folder containing generative UI components.
   * @default 'components/intent'
   */
  componentsDir?: string;
  /**
   * Server route endpoint for proxying LLM requests securely on the backend.
   * Set to `false` to disable built-in server proxying.
   * @default '/api/intent-chat'
   */
  serverRoute?: string | false;
  /**
   * Default LLM provider for the server proxy ('openai' | 'gemini' | 'anthropic' | 'ollama').
   * Can also be configured via NUXT_INTENTUI_PROVIDER environment variable.
   * @default 'openai'
   */
  provider?: 'openai' | 'gemini' | 'anthropic' | 'ollama';
  /**
   * Default LLM model name (e.g., 'gpt-4o', 'gemini-2.0-flash', 'claude-3-5-sonnet-20241022', 'llama3.1').
   * Can also be configured via NUXT_INTENTUI_MODEL environment variable.
   */
  model?: string;
  /**
   * Optional prefix for auto-imported components (e.g. 'Intent' -> '<IntentSalesChart>').
   * @default ''
   */
  prefix?: string;
}

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@intentui/nuxt',
    configKey: 'intentui',
    compatibility: {
      nuxt: '^3.0.0',
    },
  },
  defaults: {
    componentsDir: 'components/intent',
    serverRoute: '/api/intent-chat',
    provider: 'openai',
    prefix: '',
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // 1. Auto-import the <IntentRenderer> Vue Component
    addComponent({
      name: options.prefix ? `${options.prefix}Renderer` : 'IntentRenderer',
      export: 'IntentRenderer',
      filePath: '@intentui/vue',
    });

    // 2. Auto-import composables and core utilities
    addImports([
      { name: 'useIntentChat', from: '@intentui/vue' },
      { name: 'useIntentUI', from: '@intentui/vue' },
      { name: 'defineIntent', from: '@intentui/vue' },
      { name: 'createIntentUI', from: '@intentui/vue' },
      { name: 'autoDiscoverComponents', from: '@intentui/vue' },
    ]);

    // 3. Configure Nuxt runtimeConfig for server & client
    nuxt.options.runtimeConfig.intentui = {
      provider: options.provider ?? 'openai',
      model: options.model ?? '',
      apiKey: process.env.INTENTUI_API_KEY || process.env.OPENAI_API_KEY || '',
      baseURL: process.env.INTENTUI_BASE_URL || '',
      ...(nuxt.options.runtimeConfig.intentui || {}),
    };

    nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public || {};
    nuxt.options.runtimeConfig.public.intentui = {
      serverRoute: options.serverRoute,
      ...(nuxt.options.runtimeConfig.public.intentui || {}),
    };

    // 4. Register Nitro server streaming handler if enabled
    if (options.serverRoute) {
      addServerHandler({
        route: options.serverRoute,
        handler: resolver.resolve('./runtime/server/api/chat'),
      });
    }
  },
});

export default module;
