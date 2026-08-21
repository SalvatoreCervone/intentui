import type { Component } from 'vue';
import type { IntentDefinition } from '@intentui/core';
import type { VueComponentDefinition } from './plugin';

/**
 * Options for component auto-discovery.
 */
export interface AutoDiscoverOptions {
  /**
   * Custom function to transform or normalize component names.
   * By default, extracts the PascalCase/camelCase base name from the file path.
   */
  nameTransform?: (filePath: string, extractedName: string) => string;
  /**
   * Whether to require an intent/schema definition to include the component.
   * If true (default), components without schemas are skipped.
   */
  requireIntent?: boolean;
}

/**
 * Extracts the base component name from a file path.
 *
 * @example
 * './components/intent/SalesChart.vue' -> 'SalesChart'
 * './components/BookingCard.schema.ts' -> 'BookingCard'
 */
function extractBaseName(filePath: string): string {
  // Extract filename with extension
  const filename = filePath.split('/').pop() ?? filePath;
  // Remove schema and component extensions (.schema.ts, .schema.js, .vue, .ts, .js)
  return filename
    .replace(/\.schema\.(ts|js|mjs|cjs)$/, '')
    .replace(/\.(vue|ts|js|mjs|cjs|jsx|tsx)$/, '');
}

/**
 * Automatically discovers, parses, and registers Vue components from an `import.meta.glob` object.
 *
 * Supports:
 * 1. Inline `<script lang="ts"> export const intent = defineIntent({...}) </script>` inside `.vue` files.
 * 2. Named exports (`export const schema = ...`, `export const description = ...`).
 * 3. Companion schema files (e.g. `SalesChart.vue` paired with `SalesChart.schema.ts`).
 *
 * @example
 * ```ts
 * import { createIntentUI, autoDiscoverComponents } from '@intentui/vue';
 *
 * export const intentUI = createIntentUI({
 *   components: autoDiscoverComponents(
 *     import.meta.glob('./components/intent/*.vue', { eager: true })
 *   ),
 * });
 * ```
 */
export function autoDiscoverComponents(
  modules: Record<string, unknown>,
  options: AutoDiscoverOptions = {}
): Record<string, VueComponentDefinition> {
  const requireIntent = options.requireIntent ?? true;
  const result: Record<string, VueComponentDefinition> = {};

  // Group modules by base component name to support companion files (.vue + .schema.ts)
  const grouped = new Map<
    string,
    {
      component?: Component;
      intent?: IntentDefinition;
      schema?: unknown;
      description?: string;
      explicitName?: string;
      filePath: string;
    }
  >();

  for (const [filePath, rawModule] of Object.entries(modules)) {
    if (!rawModule || typeof rawModule !== 'object') continue;

    const mod = rawModule as Record<string, unknown>;
    const baseName = extractBaseName(filePath);
    const existing = grouped.get(baseName) ?? { filePath };

    // Extract component (default export or named 'component')
    if (mod.default && (typeof mod.default === 'object' || typeof mod.default === 'function')) {
      // If it looks like a Vue component SFC or defineComponent object
      existing.component = mod.default as Component;
    } else if (mod.component && (typeof mod.component === 'object' || typeof mod.component === 'function')) {
      existing.component = mod.component as Component;
    }

    // Extract IntentDefinition (either `intent` named export, or attached to default)
    if (mod.intent && typeof mod.intent === 'object') {
      existing.intent = mod.intent as IntentDefinition;
      if (existing.intent.name) {
        existing.explicitName = existing.intent.name;
      }
    } else if (
      mod.default &&
      typeof mod.default === 'object' &&
      'intent' in (mod.default as Record<string, unknown>)
    ) {
      const defaultWithIntent = mod.default as { intent?: IntentDefinition };
      if (defaultWithIntent.intent) {
        existing.intent = defaultWithIntent.intent;
        if (existing.intent.name) {
          existing.explicitName = existing.intent.name;
        }
      }
    }

    // Extract separate named exports (schema + description)
    if (mod.schema) {
      existing.schema = mod.schema;
    }
    if (typeof mod.description === 'string') {
      existing.description = mod.description;
    }

    grouped.set(baseName, existing);
  }

  // Build final VueComponentDefinition map
  for (const [baseName, entry] of grouped) {
    if (!entry.component) {
      continue;
    }

    const schema = entry.intent?.schema ?? entry.schema;
    const description = entry.intent?.description ?? entry.description;

    if (requireIntent && (!schema || !description)) {
      continue;
    }

    const finalName =
      entry.explicitName ||
      (options.nameTransform
        ? options.nameTransform(entry.filePath, baseName)
        : baseName);

    result[finalName] = {
      component: entry.component,
      schema: schema as any,
      description: description ?? '',
    };
  }

  return result;
}
