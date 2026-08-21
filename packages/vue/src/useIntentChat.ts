import { ref, type Ref } from 'vue';
import { createStreamParser, type IntentStreamChunk, type IntentAction } from '@intentui/core';
import type { IntentUIInstance } from './plugin';

/**
 * Options for the `useIntentChat` composable.
 */
export interface UseIntentChatOptions {
  /** API endpoint that returns streaming intent payloads */
  api: string;
  /** The IntentUI instance (created via `createIntentUI`) */
  intentUI: IntentUIInstance;
  /** HTTP headers for the API request */
  headers?: Record<string, string>;
  /** Called when an action from a rendered component is completed */
  onActionComplete?: (action: IntentAction) => void | Promise<void>;
}

/**
 * Return type of the `useIntentChat` composable.
 */
export interface UseIntentChatReturn {
  /** Reactive stream of intent chunks for IntentRenderer */
  aiStream: Ref<IntentStreamChunk[]>;
  /** Send a user prompt to the API */
  sendPrompt: (message: string) => Promise<void>;
  /** Handle an action emitted by a rendered component */
  handleComponentAction: (componentName: string, event: string, data: unknown) => void;
  /** Whether the stream is currently active */
  isStreaming: Ref<boolean>;
  /** Any error that occurred during the last request */
  error: Ref<Error | null>;
}

/**
 * Composable for managing the AI chat loop and generative UI streaming.
 *
 * Sends user prompts to the configured API endpoint, receives streaming
 * responses, decodes them with the core StreamParser, and produces a
 * reactive `aiStream` ref that can be passed to `<IntentRenderer>`.
 *
 * @example
 * ```ts
 * const { aiStream, sendPrompt, isStreaming, handleComponentAction } = useIntentChat({
 *   api: '/api/generate-ui',
 *   intentUI,
 *   onActionComplete: (action) => {
 *     console.log('User action:', action);
 *   },
 * });
 *
 * // Send a prompt
 * await sendPrompt('Show me sales data for Q1');
 * ```
 */
export function useIntentChat(options: UseIntentChatOptions): UseIntentChatReturn {
  const aiStream = ref<IntentStreamChunk[]>([]) as Ref<IntentStreamChunk[]>;
  const isStreaming = ref(false);
  const error = ref<Error | null>(null);

  // Register the action callback on the bridge
  if (options.onActionComplete) {
    options.intentUI.onAction(options.onActionComplete);
  }

  async function sendPrompt(message: string): Promise<void> {
    // Reset state
    aiStream.value = [];
    error.value = null;
    isStreaming.value = true;

    try {
      const response = await fetch(options.api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty — streaming is not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const parser = createStreamParser({
        onPartial: (value) => {
          // Update the stream with the partial payload
          const payload = value as Record<string, unknown>;
          const chunk: IntentStreamChunk = {
            intent: {
              component: (payload.component as string) ?? '',
              props: (payload.props as Record<string, unknown>) ?? {},
            },
            done: false,
          };

          // Replace the last streaming chunk or add a new one
          const lastIndex = aiStream.value.length - 1;
          const lastChunk = lastIndex >= 0 ? aiStream.value[lastIndex] : undefined;

          if (lastChunk && !lastChunk.done && lastChunk.intent) {
            aiStream.value[lastIndex] = chunk;
          } else {
            aiStream.value.push(chunk);
          }
        },

        onComplete: (value) => {
          if (value === undefined) return;

          const payload = value as Record<string, unknown>;
          const chunk: IntentStreamChunk = {
            intent: {
              component: (payload.component as string) ?? '',
              props: (payload.props as Record<string, unknown>) ?? {},
            },
            done: true,
          };

          // Replace the last streaming chunk with the final version
          const lastIndex = aiStream.value.length - 1;
          const lastChunk = lastIndex >= 0 ? aiStream.value[lastIndex] : undefined;

          if (lastChunk && !lastChunk.done && lastChunk.intent) {
            aiStream.value[lastIndex] = chunk;
          } else {
            aiStream.value.push(chunk);
          }
        },

        onError: (err) => {
          error.value = err;
        },
      });

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        parser.push(text);
      }

      // Finalize
      parser.end();
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      isStreaming.value = false;
    }
  }

  function handleComponentAction(componentName: string, event: string, data: unknown): void {
    options.intentUI.bridge.emit(componentName, event, data);
  }

  return {
    aiStream,
    sendPrompt,
    handleComponentAction,
    isStreaming,
    error,
  };
}
