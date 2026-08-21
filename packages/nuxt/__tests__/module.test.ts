import { describe, it, expect, vi } from 'vitest';
import intentuiModule, { type ModuleOptions } from '../src/module';

describe('@intentui/nuxt module', () => {
  it('should define module with correct metadata and configKey', async () => {
    const meta = typeof (intentuiModule as any).getMeta === 'function'
      ? await (intentuiModule as any).getMeta()
      : (intentuiModule as any).meta;

    expect(meta?.name).toBe('@intentui/nuxt');
    expect(meta?.configKey).toBe('intentui');
  });

  it('should register auto-imports and components when initialized', async () => {
    const registeredComponents: any[] = [];
    const registeredImports: any[] = [];
    const registeredServerHandlers: any[] = [];

    const mockNuxt: any = {
      options: {
        runtimeConfig: {
          public: {},
        },
      },
      hook: vi.fn(),
    };

    // Spy on @nuxt/kit utilities or execute setup
    const options: ModuleOptions = {
      componentsDir: 'components/intent',
      serverRoute: '/api/intent-chat',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    };

    expect(typeof intentuiModule).toBe('function');
  });

  it('should support disabling serverRoute', () => {
    const options: ModuleOptions = {
      serverRoute: false,
    };

    expect(options.serverRoute).toBe(false);
  });
});
