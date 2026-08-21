import { createOpenAIProvider } from './openai';
import type { LLMProvider, ProviderOptions } from './types';

/**
 * Ollama Provider Options.
 */
export interface OllamaOptions extends ProviderOptions {
  /** Host URL of the local Ollama instance (default: 'http://localhost:11434') */
  host?: string;
}

/**
 * Creates an Ollama local LLM provider connector.
 * Uses Ollama's OpenAI-compatible API at `/v1`.
 * Supports function calling on models like `llama3.1`, `mistral`, `qwen2.5`, `deepseek-r1`.
 */
export function createOllamaProvider(options: OllamaOptions): LLMProvider {
  const host = options.host ?? 'http://localhost:11434';
  const baseURL = `${host.replace(/\/+$/, '')}/v1`;

  const openAIProvider = createOpenAIProvider({
    ...options,
    baseURL: options.baseURL ?? baseURL,
    model: options.model || 'llama3.1',
  });

  return {
    name: 'ollama',
    stream(messages, callbacks, signal) {
      return openAIProvider.stream(messages, callbacks, signal);
    },
  };
}
