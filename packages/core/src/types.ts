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
