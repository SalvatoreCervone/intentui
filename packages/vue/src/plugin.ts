import {
  createRegistry,
  createActionBridge,
  type ComponentDefinition,
  type ToolDefinition,
  type IntentAction,
  type Registry,
  type ActionBridge,
} from '@intentui/core';
import type { Component } from 'vue';

/**
 * A component definition with a Vue 3 component reference.
 */
export interface VueComponentDefinition extends Omit<ComponentDefinition, 'component'> {
  /** The Vue 3 component (SFC or defineComponent) */
  component: Component;
}

/**
 * Options for creating the IntentUI instance.
 */
export interface IntentUIOptions {
  /** Map of component names to their Vue definitions with schemas */
  components: Record<string, VueComponentDefinition>;
  /** Fallback component (or lazy import) for unregistered/invalid components */
  fallback?: Component | (() => Promise<{ default: Component }>);
}

/**
 * The configured IntentUI instance.
 */
export interface IntentUIInstance {
  /** The core component registry */
  registry: Registry;
  /** The core action bridge */
  bridge: ActionBridge;
  /** Generate LLM tool definitions from the registered components */
  getToolsDefinition(): ToolDefinition[];
  /** Set a callback for handling actions from rendered components */
  onAction(callback: (action: IntentAction) => void | Promise<void>): void;
}

/**
 * Creates and configures the IntentUI instance with a Vue 3 component registry.
 *
 * This is the main entry point for IntentUI in Vue applications.
 * It wraps the core registry and action bridge, providing a unified
 * API for registering components, validating payloads, and handling actions.
 *
 * @example
 * ```ts
 * import { createIntentUI } from '@intentui/vue';
 * import { z } from 'zod';
 * import SalesChart from './components/SalesChart.vue';
 *
 * const intentUI = createIntentUI({
 *   components: {
 *     SalesChart: {
 *       component: SalesChart,
 *       description: 'Interactive sales chart',
 *       schema: z.object({ title: z.string(), data: z.array(z.number()) }),
 *     },
 *   },
 * });
 *
 * const tools = intentUI.getToolsDefinition();
 * ```
 */
export function createIntentUI(options: IntentUIOptions): IntentUIInstance {
  let actionCallback: ((action: IntentAction) => void | Promise<void>) | undefined;

  const bridge = createActionBridge({
    onAction: (action) => {
      if (actionCallback) {
        return actionCallback(action);
      }
    },
  });

  const registry = createRegistry({
    components: options.components,
    fallback: options.fallback,
  });

  return {
    registry,
    bridge,

    getToolsDefinition(): ToolDefinition[] {
      return registry.getToolsDefinition();
    },

    onAction(callback: (action: IntentAction) => void | Promise<void>): void {
      actionCallback = callback;
    },
  };
}
