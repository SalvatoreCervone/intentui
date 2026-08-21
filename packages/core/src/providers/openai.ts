import { createStreamParser } from '../parser';
import type {
  LLMProvider,
  ProviderMessage,
  ProviderOptions,
  ProviderStreamCallbacks,
} from './types';

/**
 * OpenAI Provider Options.
 */
export interface OpenAIOptions extends ProviderOptions {
  /** OpenAI Organization ID */
  organization?: string;
  /** OpenAI Project ID */
  project?: string;
}

/**
 * Extracts the component name from a tool name (e.g., "render_sales_chart" → "SalesChart").
 */
function fromToolName(toolName: string): string {
  const withoutPrefix = toolName.replace(/^render_/, '');
  return withoutPrefix
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Creates an OpenAI LLM provider connector.
 * Works with OpenAI, Groq, Together AI, OpenRouter, and any OpenAI-compatible API.
 */
export function createOpenAIProvider(options: OpenAIOptions): LLMProvider {
  const baseURL = options.baseURL ?? 'https://api.openai.com/v1';
  const customFetch = options.fetch ?? fetch;

  return {
    name: 'openai',

    async stream(
      messages: ProviderMessage[],
      callbacks: ProviderStreamCallbacks,
      signal?: AbortSignal
    ): Promise<void> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (options.apiKey) {
        headers['Authorization'] = `Bearer ${options.apiKey}`;
      }
      if (options.organization) {
        headers['OpenAI-Organization'] = options.organization;
      }
      if (options.project) {
        headers['OpenAI-Project'] = options.project;
      }

      const body: Record<string, unknown> = {
        model: options.model,
        messages: messages.map((m) => {
          if (m.role === 'tool') {
            return {
              role: 'tool',
              tool_call_id: m.tool_call_id,
              content: m.content,
            };
          }
          return {
            role: m.role,
            content: m.content,
          };
        }),
        stream: true,
      };

      if (options.temperature !== undefined) {
        body.temperature = options.temperature;
      }

      if (options.tools && options.tools.length > 0) {
        body.tools = options.tools;
        body.tool_choice = 'auto';
      }

      let response: Response;
      try {
        response = await customFetch(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal,
        });
      } catch (err) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        callbacks.onError(
          new Error(`OpenAI API error (${response.status}): ${errorText || response.statusText}`)
        );
        return;
      }

      if (!response.body) {
        callbacks.onError(new Error('Response body is empty — streaming not supported'));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let currentToolName = '';
      let streamParser: ReturnType<typeof createStreamParser> | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;

            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              let parsed: Record<string, unknown>;
              try {
                parsed = JSON.parse(jsonStr);
              } catch {
                continue;
              }

              const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
              if (!choices || choices.length === 0) continue;

              const delta = choices[0]?.delta as Record<string, unknown> | undefined;
              if (!delta) continue;

              // Plain text content delta
              if (typeof delta.content === 'string' && delta.content.length > 0) {
                callbacks.onChunk({
                  text: delta.content,
                  done: false,
                });
              }

              // Tool call streaming delta
              const toolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined;
              if (toolCalls && toolCalls.length > 0) {
                const toolCall = toolCalls[0];
                const fn = toolCall?.function as Record<string, unknown> | undefined;

                if (fn?.name && typeof fn.name === 'string') {
                  currentToolName = fn.name;
                }

                if (fn?.arguments && typeof fn.arguments === 'string') {
                  const componentName = fromToolName(currentToolName);

                  if (!streamParser) {
                    streamParser = createStreamParser({
                      onPartial: (partialProps) => {
                        callbacks.onChunk({
                          intent: {
                            component: componentName,
                            props: (partialProps as Record<string, unknown>) ?? {},
                          },
                          done: false,
                        });
                      },
                      onComplete: (finalProps) => {
                        callbacks.onChunk({
                          intent: {
                            component: componentName,
                            props: (finalProps as Record<string, unknown>) ?? {},
                          },
                          done: true,
                        });
                      },
                      onError: () => {},
                    });
                  }

                  streamParser.push(fn.arguments);
                }
              }
            }
          }
        }

        // Finalize tool parser if active
        if (streamParser) {
          streamParser.end();
        }

        callbacks.onComplete();
      } catch (err) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    },
  };
}
