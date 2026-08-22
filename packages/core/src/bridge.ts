import type { IntentStateDiff } from './types';

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
  /** Optional state diff associated with the action */
  stateDiff?: Record<string, unknown>;
  /** Timestamp of when the action was emitted */
  timestamp: number;
}

/**
 * Options for creating an action bridge.
 */
export interface ActionBridgeOptions {
  /** Called when an action is captured and ready to be sent back to the LLM */
  onAction?: (action: IntentAction) => void | Promise<void>;
  /** Called when a reactive state change/diff is captured */
  onStateDiff?: (diff: IntentStateDiff) => void | Promise<void>;
}

/**
 * The action bridge instance.
 */
export interface ActionBridge {
  /** Emit an action from a rendered component */
  emit(componentName: string, event: string, data: unknown, stateDiff?: Record<string, unknown>): void;
  /** Emit a state difference/patch from a component */
  emitStateDiff(componentName: string, diff: Record<string, unknown>, previous?: Record<string, unknown>): IntentStateDiff;
  /** Subscribe a listener to action events */
  subscribeAction(listener: (action: IntentAction) => void | Promise<void>): () => void;
  /** Subscribe a listener to state diff events */
  subscribeStateDiff(listener: (diff: IntentStateDiff) => void | Promise<void>): () => void;
  /** Get the history of all emitted actions */
  getHistory(): ReadonlyArray<IntentAction>;
  /** Get the history of all emitted state diffs */
  getStateHistory(): ReadonlyArray<IntentStateDiff>;
  /** Clear both action and state history */
  clearHistory(): void;
}

/**
 * Creates an action bridge that captures user interactions and reactive state mutations
 * from rendered components, routing them back to the LLM conversation loop and reactive UI state.
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
 *   onStateDiff: (diff) => {
 *     console.log('State updated:', diff);
 *   }
 * });
 *
 * // Emit an action
 * bridge.emit('SalesChart', 'select', { period: 'Q2' });
 *
 * // Emit a prop diff
 * bridge.emitStateDiff('SalesChart', { timeframe: 'monthly' });
 * ```
 */
export function createActionBridge(options: ActionBridgeOptions = {}): ActionBridge {
  const history: IntentAction[] = [];
  const stateHistory: IntentStateDiff[] = [];
  const actionListeners = new Set<(action: IntentAction) => void | Promise<void>>();
  const stateListeners = new Set<(diff: IntentStateDiff) => void | Promise<void>>();

  if (options.onAction) {
    actionListeners.add(options.onAction);
  }
  if (options.onStateDiff) {
    stateListeners.add(options.onStateDiff);
  }

  return {
    emit(componentName: string, event: string, data: unknown, stateDiff?: Record<string, unknown>): void {
      const action: IntentAction = {
        componentName,
        event,
        data,
        stateDiff,
        timestamp: Date.now(),
      };

      history.push(action);

      for (const listener of actionListeners) {
        void Promise.resolve(listener(action));
      }
    },

    emitStateDiff(componentName: string, diff: Record<string, unknown>, previous?: Record<string, unknown>): IntentStateDiff {
      const entry: IntentStateDiff = {
        componentName,
        diff,
        previous,
        timestamp: Date.now(),
      };

      stateHistory.push(entry);

      for (const listener of stateListeners) {
        void Promise.resolve(listener(entry));
      }

      return entry;
    },

    subscribeAction(listener: (action: IntentAction) => void | Promise<void>): () => void {
      actionListeners.add(listener);
      return () => {
        actionListeners.delete(listener);
      };
    },

    subscribeStateDiff(listener: (diff: IntentStateDiff) => void | Promise<void>): () => void {
      stateListeners.add(listener);
      return () => {
        stateListeners.delete(listener);
      };
    },

    getHistory(): ReadonlyArray<IntentAction> {
      return [...history];
    },

    getStateHistory(): ReadonlyArray<IntentStateDiff> {
      return [...stateHistory];
    },

    clearHistory(): void {
      history.length = 0;
      stateHistory.length = 0;
    },
  };
}

