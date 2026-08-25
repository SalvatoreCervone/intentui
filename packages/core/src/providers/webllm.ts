import { createStreamParser } from '../parser';
import type {
  LLMProvider,
  ProviderMessage,
  ProviderOptions,
  ProviderStreamCallbacks,
} from './types';

/**
 * Progress report emitted while downloading or initializing model weights in WebGPU.
 */
export interface WebLLMProgressReport {
  /** Numerical progress between 0 and 1 */
  progress: number;
  /** Human-readable status description (e.g., "Loading model weights...", "Initializing WebGPU pipeline") */
  text: string;
  /** Elapsed time in seconds */
  timeElapsed?: number;
}

/**
 * Configuration options for the WebLLM (in-browser WebGPU) Provider.
 */
export interface WebLLMOptions extends Omit<ProviderOptions, 'apiKey' | 'baseURL' | 'headers' | 'fetch'> {
  /**
   * Pre-existing WebLLM MLCEngine or CreateMLCEngine instance.
   * If not provided, the provider dynamically initializes WebLLM on first stream.
   */
  engine?: unknown;
  /**
   * Custom app config containing model weights URLs or cache settings.
   */
  appConfig?: unknown;
  /**
   * Callback invoked during initial model download and WebGPU compilation.
   */
  onProgress?: (report: WebLLMProgressReport) => void;
  /**
   * System prompt prepended to the conversation if not already present.
   */
  systemPrompt?: string;
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
 * Creates an in-browser WebGPU Local LLM provider connector powered by WebLLM.
 *
 * Runs small quantized models (Llama 3.2 1B, Qwen 2.5 1.5B, Phi 3.5 mini) completely client-side
 * inside the browser with zero network API latency, zero token costs, and 100% data privacy.
 *
 * @example
 * ```ts
 * import { createWebLLMProvider } from '@intentui-vue/core';
 * import { useIntentChat } from '@intentui-vue/vue';
 *
 * const provider = createWebLLMProvider({
 *   model: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
 *   onProgress: (report) => console.log(report.text, (report.progress * 100).toFixed(0) + '%'),
 * });
 * ```
 */
export function createWebLLMProvider(options: WebLLMOptions): LLMProvider {
  let engineInstance: any = options.engine;
  let isInitializing = false;

  async function getOrInitEngine(): Promise<any> {
    if (engineInstance) return engineInstance;

    if (isInitializing) {
      // Wait if already initializing
      while (isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return engineInstance;
    }

    isInitializing = true;
    try {
      // Check if webllm is already loaded globally (e.g. via CDN script tag or window)
      const globalWebLLM =
        typeof globalThis !== 'undefined'
          ? (globalThis as any).webllm
          : typeof window !== 'undefined'
            ? (window as any).webllm
            : undefined;

      let webllmModule = globalWebLLM;

      if (!webllmModule) {
        // Safe dynamic import that doesn't trigger Vite/Rollup static analysis errors
        const importModule = new Function('specifier', 'return import(specifier)');
        webllmModule = await importModule('@mlc-ai/web-llm').catch(() => {
          throw new Error(
            'WebLLM engine is not installed. Please run `pnpm add @mlc-ai/web-llm` or pass a pre-initialized engine instance.'
          );
        });
      }

      const CreateMLCEngine =
        webllmModule?.CreateMLCEngine || webllmModule?.default?.CreateMLCEngine;

      if (!CreateMLCEngine) {
        throw new Error('CreateMLCEngine could not be found in @mlc-ai/web-llm module.');
      }


      engineInstance = await CreateMLCEngine(options.model, {
        appConfig: options.appConfig,
        initProgressCallback: (report: any) => {
          if (options.onProgress) {
            options.onProgress({
              progress: typeof report.progress === 'number' ? report.progress : 0,
              text: report.text ?? String(report),
              timeElapsed: report.timeElapsed,
            });
          }
        },
      });

      return engineInstance;
    } finally {
      isInitializing = false;
    }
  }

  return {
    name: 'webllm',

    async stream(
      messages: ProviderMessage[],
      callbacks: ProviderStreamCallbacks,
      signal?: AbortSignal
    ): Promise<void> {
      let engine: any;
      try {
        engine = await getOrInitEngine();
      } catch (err) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      const formattedMessages: Array<{ role: string; content: string; name?: string; tool_call_id?: string }> = [];

      if (options.systemPrompt && !messages.some((m) => m.role === 'system')) {
        formattedMessages.push({ role: 'system', content: options.systemPrompt });
      }

      for (const m of messages) {
        if (m.role === 'tool') {
          formattedMessages.push({
            role: 'tool',
            tool_call_id: m.tool_call_id,
            name: m.name,
            content: m.content,
          });
        } else {
          formattedMessages.push({
            role: m.role,
            content: m.content,
          });
        }
      }

      const requestPayload: Record<string, unknown> = {
        messages: formattedMessages,
        stream: true,
      };

      if (options.temperature !== undefined) {
        requestPayload.temperature = options.temperature;
      }

      if (options.tools && options.tools.length > 0) {
        requestPayload.tools = options.tools;
        requestPayload.tool_choice = 'auto';
      }

      let toolName = '';
      let jsonParser: ReturnType<typeof createStreamParser> | null = null;

      try {
        const completionStream = await engine.chat.completions.create(requestPayload);

        if (signal) {
          signal.addEventListener(
            'abort',
            () => {
              if (engine.interruptGenerate) {
                engine.interruptGenerate();
              }
            },
            { once: true }
          );
        }

        for await (const chunk of completionStream) {
          if (signal?.aborted) break;

          const choice = chunk.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta;

          // 1. Text content delta
          if (delta?.content) {
            callbacks.onChunk({ text: delta.content });
          }

          // 2. Tool call arguments delta
          if (delta?.tool_calls && delta.tool_calls.length > 0) {
            const toolCall = delta.tool_calls[0];

            if (toolCall.function?.name) {
              toolName = fromToolName(toolCall.function.name);
            }

            if (toolCall.function?.arguments) {
              if (!jsonParser) {
                jsonParser = createStreamParser({
                  onPartial: (props) => {
                    callbacks.onChunk({
                      intent: {
                        component: toolName,
                        props: (props as Record<string, unknown>) ?? {},
                      },
                      done: false,
                    });
                  },
                  onComplete: (props) => {
                    callbacks.onChunk({
                      intent: {
                        component: toolName,
                        props: (props as Record<string, unknown>) ?? {},
                      },
                      done: true,
                    });
                  },
                  onError: (err) => {
                    callbacks.onError(err);
                  },
                });
              }

              jsonParser.push(toolCall.function.arguments);
            }
          }

          if (choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls') {
            if (jsonParser) {
              jsonParser.end();
            }
          }
        }

        callbacks.onComplete();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    },
  };
}
