import type { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * A registered component definition with its schema and metadata.
 */
export interface ComponentDefinition {
  /** The actual component reference (opaque to core — could be Vue, React, etc.) */
  component: unknown;
  /** Human-readable description for the LLM to understand when to use this component */
  description: string;
  /** Zod schema defining and validating the component's props */
  schema: ZodType;
}

/**
 * Standalone intent metadata and schema definition for a component.
 * Allows components to declare their AI capabilities inline or in companion schema files.
 */
export interface IntentDefinition<T extends ZodType = ZodType> {
  /** Optional explicit component name (defaults to file/variable name during discovery) */
  name?: string;
  /** Human-readable description for the LLM to understand when to use this component */
  description: string;
  /** Zod schema defining and validating the component's props */
  schema: T;
}

/**
 * Type-helper to define an intent definition with type inference.
 *
 * @example
 * ```ts
 * export const intent = defineIntent({
 *   description: 'Interactive sales chart showing revenue breakdown over time',
 *   schema: z.object({
 *     title: z.string(),
 *     metrics: z.array(z.object({ label: z.string(), value: z.number() })),
 *   }),
 * });
 * ```
 */
export function defineIntent<T extends ZodType = ZodType>(
  definition: IntentDefinition<T>
): IntentDefinition<T> {
  return definition;
}

/**
 * Options for creating a component registry.
 */
export interface RegistryOptions {
  /** Map of component names to their definitions */
  components: Record<string, ComponentDefinition>;
  /** Fallback component used when the requested name is not found or validation fails */
  fallback?: unknown;
}

/**
 * A resolved component ready for rendering.
 */
export interface ResolvedComponent {
  /** The registered component name */
  name: string;
  /** The resolved component reference */
  component: unknown;
  /** The validated props (or raw props if validation failed) */
  props: Record<string, unknown>;
  /** Whether the props passed schema validation */
  isValid: boolean;
  /** Validation error messages, if any */
  errors?: string[];
}

/**
 * An LLM-compatible tool/function definition generated from a registered component.
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * The component registry instance.
 */
export interface Registry {
  /** Resolve a component name + raw props into a validated ResolvedComponent */
  resolve(name: string, rawProps: Record<string, unknown>): ResolvedComponent;
  /** Check if a component name is registered */
  has(name: string): boolean;
  /** Get the list of all registered component names */
  list(): string[];
  /** Generate LLM tool definitions from all registered component schemas */
  getToolsDefinition(): ToolDefinition[];
  /** Get the fallback component, if any */
  getFallback(): unknown | undefined;
}

/**
 * Converts a component registry key to a tool function name.
 * e.g., "SalesChart" → "render_sales_chart"
 */
function toToolName(componentName: string): string {
  return (
    'render_' +
    componentName
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
      .toLowerCase()
  );
}

/**
 * Creates a component registry that stores component definitions,
 * validates incoming payloads against Zod schemas, and generates
 * LLM-compatible tool definitions.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { createRegistry } from '@intentui/core';
 *
 * const registry = createRegistry({
 *   components: {
 *     SalesChart: {
 *       component: SalesChartComponent,
 *       description: 'Displays a sales chart',
 *       schema: z.object({
 *         title: z.string(),
 *         data: z.array(z.number()),
 *       }),
 *     },
 *   },
 * });
 *
 * // Validate and resolve
 * const resolved = registry.resolve('SalesChart', { title: 'Q1', data: [1, 2, 3] });
 *
 * // Generate tool definitions for the LLM
 * const tools = registry.getToolsDefinition();
 * ```
 */
export function createRegistry(options: RegistryOptions): Registry {
  const components = new Map<string, ComponentDefinition>();

  // Populate the registry
  for (const [name, definition] of Object.entries(options.components)) {
    components.set(name, definition);
  }

  return {
    resolve(name: string, rawProps: Record<string, unknown>): ResolvedComponent {
      const definition = components.get(name);

      if (!definition) {
        return {
          name,
          component: options.fallback ?? null,
          props: rawProps,
          isValid: false,
          errors: [`Component "${name}" is not registered`],
        };
      }

      const result = definition.schema.safeParse(rawProps);

      if (result.success) {
        return {
          name,
          component: definition.component,
          props: result.data as Record<string, unknown>,
          isValid: true,
        };
      }

      return {
        name,
        component: options.fallback ?? definition.component,
        props: rawProps,
        isValid: false,
        errors: result.error.errors.map(
          (e) => `${e.path.join('.')}: ${e.message}`
        ),
      };
    },

    has(name: string): boolean {
      return components.has(name);
    },

    list(): string[] {
      return Array.from(components.keys());
    },

    getToolsDefinition(): ToolDefinition[] {
      const tools: ToolDefinition[] = [];

      for (const [name, definition] of components) {
        const jsonSchema = zodToJsonSchema(definition.schema, {
          name: name,
          target: 'openApi3',
        });

        // Extract the actual schema definition (zodToJsonSchema wraps it)
        const parameters =
          (jsonSchema as Record<string, unknown>).definitions?.[name] ??
          jsonSchema;

        tools.push({
          type: 'function',
          function: {
            name: toToolName(name),
            description: definition.description,
            parameters: parameters as Record<string, unknown>,
          },
        });
      }

      return tools;
    },

    getFallback(): unknown | undefined {
      return options.fallback;
    },
  };
}
