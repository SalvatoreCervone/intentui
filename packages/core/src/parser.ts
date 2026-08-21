import { parse as parsePartialJson } from 'partial-json';

/**
 * Options for the streaming JSON parser.
 */
export interface StreamParserOptions {
  /** Called every time a new usable partial object is available */
  onPartial: (value: unknown) => void;
  /** Called when the final complete object is available */
  onComplete: (value: unknown) => void;
  /** Called on unrecoverable parse errors */
  onError: (error: Error) => void;
}

/**
 * The streaming parser instance returned by `createStreamParser`.
 */
export interface StreamParser {
  /** Feed a new text chunk into the parser */
  push(chunk: string): void;
  /** Signal end of stream and finalize parsing */
  end(): void;
  /** Reset parser state for reuse */
  reset(): void;
  /** Get the current accumulated buffer */
  getBuffer(): string;
}

/**
 * Creates a streaming JSON parser that can process partial/incomplete JSON
 * chunks from an LLM and produce usable JavaScript objects at each step.
 *
 * Uses `partial-json` under the hood for tolerant parsing of incomplete JSON
 * (missing closing brackets, incomplete strings, partial arrays, etc.).
 *
 * @example
 * ```ts
 * const parser = createStreamParser({
 *   onPartial: (value) => console.log('Partial:', value),
 *   onComplete: (value) => console.log('Done:', value),
 *   onError: (error) => console.error('Error:', error),
 * });
 *
 * parser.push('{ "title": "Sa');
 * // onPartial → { title: "Sa" }
 *
 * parser.push('les Report", "data": [1, 2');
 * // onPartial → { title: "Sales Report", data: [1, 2] }
 *
 * parser.push(', 3] }');
 * parser.end();
 * // onComplete → { title: "Sales Report", data: [1, 2, 3] }
 * ```
 */
export function createStreamParser(options: StreamParserOptions): StreamParser {
  let buffer = '';
  let lastParsedJson = '';

  function tryParse(): void {
    const trimmed = buffer.trim();
    if (trimmed.length === 0) return;

    try {
      const parsed = parsePartialJson(trimmed);

      // Only fire onPartial if the parsed result has actually changed
      const currentJson = JSON.stringify(parsed);
      if (currentJson !== lastParsedJson) {
        lastParsedJson = currentJson;
        options.onPartial(parsed);
      }
    } catch {
      // Partial parse failed — this is expected during streaming.
      // We simply wait for more chunks.
    }
  }

  return {
    push(chunk: string): void {
      buffer += chunk;
      tryParse();
    },

    end(): void {
      const trimmed = buffer.trim();
      if (trimmed.length === 0) {
        options.onComplete(undefined);
        return;
      }

      try {
        // Attempt a strict parse for the final result
        const finalValue = JSON.parse(trimmed);
        options.onComplete(finalValue);
      } catch {
        // If strict parse fails, try partial as a best-effort fallback
        try {
          const partialValue = parsePartialJson(trimmed);
          options.onComplete(partialValue);
        } catch (innerError) {
          options.onError(
            innerError instanceof Error
              ? innerError
              : new Error(`Failed to parse JSON: ${String(innerError)}`)
          );
        }
      }
    },

    reset(): void {
      buffer = '';
      lastParsedJson = '';
    },

    getBuffer(): string {
      return buffer;
    },
  };
}
