export * from './types';
export { createOpenAIProvider } from './openai';
export type { OpenAIOptions } from './openai';
export { createGeminiProvider } from './gemini';
export type { GeminiOptions } from './gemini';
export { createAnthropicProvider } from './anthropic';
export type { AnthropicOptions } from './anthropic';
export { createOllamaProvider } from './ollama';
export type { OllamaOptions } from './ollama';

import { createOpenAIProvider, type OpenAIOptions } from './openai';
import { createGeminiProvider, type GeminiOptions } from './gemini';
import { createAnthropicProvider, type AnthropicOptions } from './anthropic';
import { createOllamaProvider, type OllamaOptions } from './ollama';
import type { LLMProvider, ProviderOptions } from './types';

export type ProviderType = 'openai' | 'gemini' | 'anthropic' | 'ollama';

export interface CreateProviderConfig {
  type: ProviderType;
  options: ProviderOptions & (OpenAIOptions | GeminiOptions | AnthropicOptions | OllamaOptions);
}

/**
 * Universal factory function to instantiate any supported LLM provider.
 *
 * @example
 * ```ts
 * const openai = createProvider({
 *   type: 'openai',
 *   options: { model: 'gpt-4o', apiKey: 'sk-...' },
 * });
 *
 * const ollama = createProvider({
 *   type: 'ollama',
 *   options: { model: 'llama3.1' },
 * });
 * ```
 */
export function createProvider(config: CreateProviderConfig): LLMProvider {
  switch (config.type) {
    case 'openai':
      return createOpenAIProvider(config.options as OpenAIOptions);
    case 'gemini':
      return createGeminiProvider(config.options as GeminiOptions);
    case 'anthropic':
      return createAnthropicProvider(config.options as AnthropicOptions);
    case 'ollama':
      return createOllamaProvider(config.options as OllamaOptions);
    default:
      throw new Error(`Unsupported provider type: ${(config as { type: string }).type}`);
  }
}
