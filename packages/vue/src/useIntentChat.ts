import { ref, type Ref } from 'vue';
import {
  createStreamParser,
  type IntentStreamChunk,
  type IntentAction,
  type IntentStateDiff,
  type LLMProvider,
  type ProviderMessage,
} from '@intentui/core';
import type { IntentUIInstance } from './plugin';

/**
 * Options for the `useIntentChat` composable.
 */
export interface UseIntentChatOptions {
  /** The IntentUI instance (created via `createIntentUI`) */
  intentUI: IntentUIInstance;
  /** Custom backend API endpoint URL (optional if provider is passed) */
  api?: string;
  /** Direct LLM Provider instance (OpenAI, Gemini, Claude, Ollama) */
  provider?: LLMProvider;
  /** HTTP headers for API requests */
  headers?: Record<string, string>;
  /** System prompt for the conversation */
  systemPrompt?: string;
  /** Called when an action from a rendered component is completed */
  onActionComplete?: (action: IntentAction) => void | Promise<void>;
  /** Called when a reactive state change/diff from a component is completed */
  onStateDiffComplete?: (diff: IntentStateDiff) => void | Promise<void>;
  /** Automatically trigger next LLM completion when an action is emitted (default: true) */
  autoContinueOnAction?: boolean;
}

/**
 * Return type of the `useIntentChat` composable.
 */
export interface UseIntentChatReturn {
  /** Reactive stream of intent chunks for IntentRenderer */
  aiStream: Ref<IntentStreamChunk[]>;
  /** Multi-turn message history */
  messages: Ref<ProviderMessage[]>;
  /** Send a user prompt to the AI */
  sendPrompt: (message: string) => Promise<void>;
  /** Handle an action emitted by a rendered component */
  handleComponentAction: (componentName: string, event: string, data: unknown) => Promise<void>;
  /** Handle a reactive state difference/mutation emitted by a component */
  handleStateChange: (
    componentName: string,
    diff: Record<string, unknown>,
    previous?: Record<string, unknown>,
    continueThread?: boolean
  ) => Promise<void>;
  /** Fine-grained reactive patch applied directly to the current rendered intent's props */
  patchLastIntentProps: (diff: Record<string, unknown>) => void;
  /** Cancel the currently active streaming response */
  cancelStream: () => void;
  /** Clear conversation history and reset active stream */
  clearChat: () => void;
  /** Whether the stream is currently active */
  isStreaming: Ref<boolean>;
  /** Any error that occurred during the last request */
  error: Ref<Error | null>;
}


/**
 * Composable for managing the AI chat lifecycle and generative UI streaming.
 *
 * Supports both direct LLM Provider instances (OpenAI, Gemini, Claude, Ollama)
 * and custom backend API endpoints (`api: '/api/generate-ui'`).
 *
 * Implements the full agentic round-trip loop: when a user clicks a button or
 * submits a form in a rendered component, `useIntentChat` automatically formats
 * the action as a `tool` response message and continues the conversation.
 *
 * @example
 * ```ts
 * const { aiStream, messages, sendPrompt, handleComponentAction } = useIntentChat({
 *   intentUI,
 *   provider: createOpenAIProvider({ model: 'gpt-4o', apiKey: 'sk-...' }),
 *   onActionComplete: (action) => console.log('Action performed:', action),
 * });
 *
 * await sendPrompt('Show sales breakdown for last quarter');
 * ```
 */
export function useIntentChat(options: UseIntentChatOptions): UseIntentChatReturn {
  const aiStream = ref<IntentStreamChunk[]>([]) as Ref<IntentStreamChunk[]>;
  const messages = ref<ProviderMessage[]>([]) as Ref<ProviderMessage[]>;
  const isStreaming = ref(false);
  const error = ref<Error | null>(null);

  let abortController: AbortController | null = null;
  const autoContinue = options.autoContinueOnAction ?? true;

  // Initialize with system prompt if provided
  if (options.systemPrompt && messages.value.length === 0) {
    messages.value.push({ role: 'system', content: options.systemPrompt });
  }

  // Register bridge action handler
  options.intentUI.onAction(async (action) => {
    if (options.onActionComplete) {
      await options.onActionComplete(action);
    }
  });

  // Register bridge state diff handler
  options.intentUI.onStateDiff(async (diff) => {
    if (options.onStateDiffComplete) {
      await options.onStateDiffComplete(diff);
    }
  });

  function cancelStream(): void {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    isStreaming.value = false;
  }

  function clearChat(): void {
    cancelStream();
    aiStream.value = [];
    messages.value = options.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }]
      : [];
    error.value = null;
  }

  function patchLastIntentProps(diff: Record<string, unknown>): void {
    const lastIndex = aiStream.value.length - 1;
    if (lastIndex >= 0 && aiStream.value[lastIndex]?.intent) {
      const currentChunk = aiStream.value[lastIndex]!;
      aiStream.value[lastIndex] = {
        ...currentChunk,
        intent: {
          ...currentChunk.intent!,
          props: {
            ...currentChunk.intent!.props,
            ...diff,
          },
        },
      };
    }
  }

  async function executeStream(): Promise<void> {
    cancelStream();
    abortController = new AbortController();
    isStreaming.value = true;
    error.value = null;

    let assistantText = '';
    let lastIntent: { component: string; props: Record<string, unknown> } | null = null;

    // Use direct Provider if available
    if (options.provider) {
      try {
        await options.provider.stream(
          messages.value,
          {
            onChunk: (chunk) => {
              if (chunk.text) {
                assistantText += chunk.text;
              }
              if (chunk.intent) {
                lastIntent = chunk.intent;
              }

              // Replace the last streaming chunk or add a new one
              const lastIndex = aiStream.value.length - 1;
              const lastChunk = lastIndex >= 0 ? aiStream.value[lastIndex] : undefined;

              if (lastChunk && !lastChunk.done && lastChunk.intent) {
                aiStream.value[lastIndex] = chunk;
              } else {
                aiStream.value.push(chunk);
              }
            },
            onComplete: () => {
              // Record assistant response in message history
              const content = assistantText || (lastIntent ? `[Rendered ${lastIntent.component}]` : '');
              if (content) {
                messages.value.push({ role: 'assistant', content });
              }
              isStreaming.value = false;
            },
            onError: (err) => {
              error.value = err;
              isStreaming.value = false;
            },
          },
          abortController.signal
        );
      } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
        isStreaming.value = false;
      }
      return;
    }

    // Fallback: Use HTTP API endpoint
    if (!options.api) {
      error.value = new Error('Either `provider` or `api` option must be provided to useIntentChat');
      isStreaming.value = false;
      return;
    }

    try {
      const response = await fetch(options.api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify({
          messages: messages.value,
          tools: options.intentUI.getToolsDefinition(),
        }),
        signal: abortController.signal,
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
          const payload = value as Record<string, unknown>;
          const chunk: IntentStreamChunk = {
            intent: {
              component: (payload.component as string) ?? '',
              props: (payload.props as Record<string, unknown>) ?? {},
            },
            done: false,
          };

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
          const component = (payload.component as string) ?? '';
          const props = (payload.props as Record<string, unknown>) ?? {};

          const chunk: IntentStreamChunk = {
            intent: { component, props },
            done: true,
          };

          const lastIndex = aiStream.value.length - 1;
          const lastChunk = lastIndex >= 0 ? aiStream.value[lastIndex] : undefined;

          if (lastChunk && !lastChunk.done && lastChunk.intent) {
            aiStream.value[lastIndex] = chunk;
          } else {
            aiStream.value.push(chunk);
          }

          messages.value.push({ role: 'assistant', content: `[Rendered ${component}]` });
        },

        onError: (err) => {
          error.value = err;
        },
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        parser.push(text);
      }

      parser.end();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        error.value = err instanceof Error ? err : new Error(String(err));
      }
    } finally {
      isStreaming.value = false;
    }
  }

  async function sendPrompt(message: string): Promise<void> {
    messages.value.push({ role: 'user', content: message });
    await executeStream();
  }

  async function handleComponentAction(
    componentName: string,
    event: string,
    data: unknown
  ): Promise<void> {
    // Emit through bridge
    options.intentUI.bridge.emit(componentName, event, data);

    // Agentic feedback loop: append tool result and continue conversation
    if (autoContinue) {
      messages.value.push({
        role: 'tool',
        name: `render_${componentName.toLowerCase()}`,
        content: JSON.stringify({ event, data }),
      });

      await executeStream();
    }
  }

  async function handleStateChange(
    componentName: string,
    diff: Record<string, unknown>,
    previous?: Record<string, unknown>,
    continueThread: boolean = false
  ): Promise<void> {
    // 1. Emit through bridge
    options.intentUI.bridge.emitStateDiff(componentName, diff, previous);

    // 2. Reactively patch local props for instant UI update
    patchLastIntentProps(diff);

    // 3. If continueThread is requested, notify agent of state change
    if (continueThread) {
      messages.value.push({
        role: 'tool',
        name: `state_diff_${componentName.toLowerCase()}`,
        content: JSON.stringify({ diff, previous }),
      });

      await executeStream();
    }
  }

  return {
    aiStream,
    messages,
    sendPrompt,
    handleComponentAction,
    handleStateChange,
    patchLastIntentProps,
    cancelStream,
    clearChat,
    isStreaming,
    error,
  };
}

