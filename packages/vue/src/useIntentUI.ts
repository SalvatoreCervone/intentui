import { ref, type Ref } from 'vue';
import type { IntentPayload, ResolvedComponent } from '@intentui/core';
import type { IntentUIInstance } from './plugin';

/**
 * Options for the `useIntentUI` composable.
 */
export interface UseIntentUIOptions {
  /** The IntentUI instance (created via `createIntentUI`) */
  intentUI: IntentUIInstance;
  /** Called when a user action is emitted from a rendered component */
  onAction?: (eventName: string, payload: unknown) => void | Promise<void>;
}

/**
 * Return type of the `useIntentUI` composable.
 */
export interface UseIntentUIReturn {
  /** Resolve a component by name and props, returning the validated result */
  renderComponent: (name: string, props: Record<string, unknown>) => ResolvedComponent;
  /** Whether content is currently being streamed */
  isStreaming: Ref<boolean>;
  /** The currently active intent payload, if any */
  currentPayload: Ref<IntentPayload | null>;
  /** Emit an action from a rendered component */
  emitAction: (componentName: string, event: string, data: unknown) => void;
}

/**
 * Lower-level composable for canvas-style and custom intent-driven interfaces.
 *
 * Unlike `useIntentChat`, this composable does not manage the chat loop or
 * API requests. It provides direct access to the registry and bridge for
 * manual control over component resolution and action handling.
 *
 * @example
 * ```ts
 * const { renderComponent, emitAction, currentPayload } = useIntentUI({
 *   intentUI,
 *   onAction: async (event, payload) => {
 *     console.log('Action:', event, payload);
 *   },
 * });
 *
 * // Manually resolve and render a component
 * const resolved = renderComponent('SalesChart', { title: 'Q1', data: [1, 2, 3] });
 * ```
 */
export function useIntentUI(options: UseIntentUIOptions): UseIntentUIReturn {
  const isStreaming = ref(false);
  const currentPayload = ref<IntentPayload | null>(null) as Ref<IntentPayload | null>;

  // Register the action callback
  if (options.onAction) {
    const callback = options.onAction;
    options.intentUI.onAction((action) => {
      return callback(action.event, action.data);
    });
  }

  function renderComponent(name: string, props: Record<string, unknown>): ResolvedComponent {
    currentPayload.value = { component: name, props };
    return options.intentUI.registry.resolve(name, props);
  }

  function emitAction(componentName: string, event: string, data: unknown): void {
    options.intentUI.bridge.emit(componentName, event, data);
  }

  return {
    renderComponent,
    isStreaming,
    currentPayload,
    emitAction,
  };
}
