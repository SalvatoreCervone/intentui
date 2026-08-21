import { createStreamParser } from '../parser';
import type {
  LLMProvider,
  ProviderMessage,
  ProviderOptions,
  ProviderStreamCallbacks,
} from './types';

/**
 * Anthropic Claude Provider Options.
 */
export interface AnthropicOptions extends ProviderOptions {
  /** Anthropic API Version (default: '2023-06-01') */
  anthropicVersion?: string;
  /** Maximum tokens to generate (default: 4096) */
  maxTokens?: number;
}

function fromToolName(toolName: string): string {
  const withoutPrefix = toolName.replace(/^render_/, '');
  return withoutPrefix
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Creates an Anthropic Claude LLM provider connector.
 */
export function createAnthropicProvider(options: AnthropicOptions): LLMProvider {
  const baseURL = options.baseURL ?? 'https://api.anthropic.com/v1';
  const customFetch = options.fetch ?? fetch;

  return {
    name: 'anthropic',

    async stream(
      messages: ProviderMessage[],
      callbacks: ProviderStreamCallbacks,
      signal?: AbortSignal
    ): Promise<void> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'anthropic-version': options.anthropicVersion ?? '2023-06-01',
        ...options.headers,
      };

      if (options.apiKey) {
        headers['x-api-key'] = options.apiKey;
      }

      // Convert messages to Claude format (system is top-level)
      let systemPrompt: string | undefined;
      const formattedMessages: Array<{ role: string; content: unknown }> = [];

      for (const m of messages) {
        if (m.role === 'system') {
          systemPrompt = m.content;
          continue;
        }

        if (m.role === 'tool') {
          formattedMessages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: m.tool_call_id,
                content: m.content,
              },
            ],
          });
          continue;
        }

        formattedMessages.push({
          role: m.role,
          content: m.content,
        });
      }

      const body: Record<string, unknown> = {
        model: options.model,
        messages: formattedMessages,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
      };

      if (systemPrompt) {
        body.system = systemPrompt;
      }

      if (options.temperature !== undefined) {
        body.temperature = options.temperature;
      }

      if (options.tools && options.tools.length > 0) {
        body.tools = options.tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters,
        }));
      }

      let response: Response;
      try {
        response = await customFetch(`${baseURL}/messages`, {
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
          new Error(`Anthropic API error (${response.status}): ${errorText || response.statusText}`)
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
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const jsonStr = trimmed.slice(6);
            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            const type = parsed.type as string | undefined;

            // Text delta
            if (type === 'content_block_delta') {
              const delta = parsed.delta as Record<string, unknown> | undefined;
              if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
                callbacks.onChunk({
                  text: delta.text,
                  done: false,
                });
              }

              // Tool use input JSON delta
              if (delta?.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
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

                streamParser.push(delta.partial_json);
              }
            }

            // Start of a content block (check if tool_use)
            if (type === 'content_block_start') {
              const contentBlock = parsed.content_block as Record<string, unknown> | undefined;
              if (contentBlock?.type === 'tool_use' && typeof contentBlock.name === 'string') {
                currentToolName = contentBlock.name;
              }
            }

            // End of block
            if (type === 'content_block_stop' && streamParser) {
              streamParser.end();
              streamParser = null;
            }
          }
        }

        callbacks.onComplete();
      } catch (err) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    },
  };
}
