import type {
  LLMProvider,
  ProviderMessage,
  ProviderOptions,
  ProviderStreamCallbacks,
} from './types';

/**
 * Gemini Provider Options.
 */
export interface GeminiOptions extends ProviderOptions {
  /** API version (default: 'v1beta') */
  apiVersion?: string;
}

function fromToolName(toolName: string): string {
  const withoutPrefix = toolName.replace(/^render_/, '');
  return withoutPrefix
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Recursively cleans JSON Schema for Google Gemini REST API.
 * Gemini strictly rejects fields like `additionalProperties`, `$schema`, `definitions`.
 */
function cleanSchemaForGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(cleanSchemaForGemini);
  }
  if (schema !== null && typeof schema === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
      if (
        key === 'additionalProperties' ||
        key === '$schema' ||
        key === 'definitions' ||
        key === '$ref'
      ) {
        continue;
      }
      cleaned[key] = cleanSchemaForGemini(value);
    }
    return cleaned;
  }
  return schema;
}

/**
 * Creates a Google Gemini LLM provider connector.
 * Uses Gemini REST API with SSE streaming.
 */
export function createGeminiProvider(options: GeminiOptions): LLMProvider {
  const apiVersion = options.apiVersion ?? 'v1beta';
  const customFetch = options.fetch ?? fetch;

  return {
    name: 'gemini',

    async stream(
      messages: ProviderMessage[],
      callbacks: ProviderStreamCallbacks,
      signal?: AbortSignal
    ): Promise<void> {
      const apiKey = options.apiKey ?? '';
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${options.model}:streamGenerateContent?alt=sse&key=${apiKey}`;

      // Convert messages to Gemini format
      const contents = messages.map((m) => {
        const role = m.role === 'assistant' ? 'model' : 'user';

        if (m.role === 'tool') {
          return {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: m.name ?? 'tool_response',
                  response: { output: m.content },
                },
              },
            ],
          };
        }

        return {
          role,
          parts: [{ text: m.content }],
        };
      });

      const body: Record<string, unknown> = { contents };

      if (options.temperature !== undefined) {
        body.generationConfig = { temperature: options.temperature };
      }

      if (options.tools && options.tools.length > 0) {
        body.tools = [
          {
            functionDeclarations: options.tools.map((t) => ({
              name: t.function.name,
              description: t.function.description,
              parameters: cleanSchemaForGemini(t.function.parameters),
            })),
          },
        ];
      }

      let response: Response;
      try {
        response = await customFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
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
          new Error(`Gemini API error (${response.status}): ${errorText || response.statusText}`)
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

            const candidates = parsed.candidates as Array<Record<string, unknown>> | undefined;
            if (!candidates || candidates.length === 0) continue;

            const content = candidates[0]?.content as Record<string, unknown> | undefined;
            const parts = content?.parts as Array<Record<string, unknown>> | undefined;
            if (!parts) continue;

            for (const part of parts) {
              // Text part
              if (typeof part.text === 'string') {
                callbacks.onChunk({
                  text: part.text,
                  done: false,
                });
              }

              // Function call part
              if (part.functionCall && typeof part.functionCall === 'object') {
                const fnCall = part.functionCall as { name?: string; args?: Record<string, unknown> };
                const componentName = fromToolName(fnCall.name ?? '');

                callbacks.onChunk({
                  intent: {
                    component: componentName,
                    props: fnCall.args ?? {},
                  },
                  done: true,
                });
              }
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
