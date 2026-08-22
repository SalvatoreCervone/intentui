/**
 * The shape of a single "intent" payload from the LLM.
 * Represents a request to render a specific component with specific props.
 */
export interface IntentPayload {
  /** The registered component name to render */
  component: string;
  /** The props to pass to the component */
  props: Record<string, unknown>;
}

/**
 * A single chunk in an intent stream.
 * Can contain text content, a component intent, or both.
 */
export interface IntentStreamChunk {
  /** Raw text content (markdown, plain text) — rendered as-is */
  text?: string;
  /** A component intent to render */
  intent?: IntentPayload;
  /** Whether this chunk is the final one in the stream */
  done?: boolean;
}

/**
 * Deep partial utility type.
 * Makes all properties optional recursively, useful for representing
 * partially-streamed data before the full payload is available.
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Represents a granular diff/patch to a component's props or state.
 */
export interface IntentStateDiff<T = Record<string, unknown>> {
  /** Component identifier */
  componentName: string;
  /** Changed properties and their new values */
  diff: Partial<T>;
  /** Optional previous values of the changed properties */
  previous?: Partial<T>;
  /** Timestamp of the state transition */
  timestamp: number;
}

/**
 * Computes a shallow/deep comparable key-value diff between two objects.
 * Returns only the keys in `next` that differ from `prev`.
 */
export function computeStateDiff<T extends Record<string, unknown>>(
  prev: T,
  next: T
): Partial<T> {
  const diff: Partial<T> = {};
  const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);

  for (const key of allKeys) {
    const k = key as keyof T;
    const prevVal = prev?.[k];
    const nextVal = next?.[k];

    if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
      diff[k] = nextVal;
    }
  }

  return diff;
}

