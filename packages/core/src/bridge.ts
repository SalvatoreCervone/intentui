/**
 * Represents a user action emitted from a rendered component.
 */
export interface IntentAction {
  /** The component that emitted the action */
  componentName: string;
  /** The event name (e.g., 'submit', 'select', 'click', 'dismiss') */
  event: string;
  /** The payload data from the component */
  data: unknown;
  /** Timestamp of when the action was emitted */
  timestamp: number;
}

/**
 * Options for creating an action bridge.
 */
export interface ActionBridgeOptions {
  /** Called when an action is captured and ready to be sent back to the LLM */
  onAction?: (action: IntentAction) => void | Promise<void>;
}

/**
 * The action bridge instance.
 */
export interface ActionBridge {
  /** Emit an action from a rendered component */
  emit(componentName: string, event: string, data: unknown): void;
  /** Get the history of all emitted actions */
  getHistory(): ReadonlyArray<IntentAction>;
  /** Clear the action history */
  clearHistory(): void;
}

/**
 * Creates an action bridge that captures user interactions from rendered
 * components and routes them back to the LLM conversation loop.
 *
 * The bridge maintains a history of all emitted actions and notifies
 * subscribers via the `onAction` callback.
 *
 * @example
 * ```ts
 * const bridge = createActionBridge({
 *   onAction: async (action) => {
 *     // Send the action back to the LLM as a tool response
 *     await sendToolResponse({
 *       tool: action.componentName,
 *       event: action.event,
 *       data: action.data,
 *     });
 *   },
 * });
 *
 * // When a user clicks a button in a rendered SalesChart
 * bridge.emit('SalesChart', 'select', { period: 'Q2' });
 * ```
 */
export function createActionBridge(options: ActionBridgeOptions = {}): ActionBridge {
  const history: IntentAction[] = [];

  return {
    emit(componentName: string, event: string, data: unknown): void {
      const action: IntentAction = {
        componentName,
        event,
        data,
        timestamp: Date.now(),
      };

      history.push(action);

      if (options.onAction) {
        // Fire and forget — don't block the emit call
        void Promise.resolve(options.onAction(action));
      }
    },

    getHistory(): ReadonlyArray<IntentAction> {
      return [...history];
    },

    clearHistory(): void {
      history.length = 0;
    },
  };
}
