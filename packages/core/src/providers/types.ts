import type { ToolDefinition } from '../registry';
import type { IntentStreamChunk } from '../types';

/**
 * A message in a multi-turn LLM conversation.
 */
export interface ProviderMessage {
  /** The role of the message sender */
  role: 'system' | 'user' | 'assistant' | 'tool';
  /** Text content of the message */
  content: string;
  /** Unique ID of the tool call (required for role: 'tool') */
  tool_call_id?: string;
  /** Name of the tool function (optional) */
  name?: string;
}

/**
 * Common configuration options for all LLM providers.
 */
export interface ProviderOptions {
  /** Model identifier (e.g., 'gpt-4o', 'gemini-2.0-flash', 'claude-3-5-sonnet', 'llama3') */
  model: string;
  /** API key for authenticating with the provider */
  apiKey?: string;
  /** Custom base URL for the API endpoint (e.g. for proxies, Ollama, OpenRouter) */
  baseURL?: string;
  /** List of tool definitions available to the model */
  tools?: ToolDefinition[];
  /** Sampling temperature (0.0 to 2.0) */
  temperature?: number;
  /** Additional custom HTTP headers */
  headers?: Record<string, string>;
  /** Optional custom fetch implementation */
  fetch?: typeof fetch;
}

/**
 * Callbacks invoked during response streaming.
 */
export interface ProviderStreamCallbacks {
  /** Called whenever a new text or component intent chunk is decoded */
  onChunk: (chunk: IntentStreamChunk) => void;
  /** Called when the stream completes successfully */
  onComplete: () => void;
  /** Called if an unrecoverable error occurs during streaming */
  onError: (error: Error) => void;
}

/**
 * Standard interface that all LLM provider connectors implement.
 */
export interface LLMProvider {
  /** The provider identifier (e.g., 'openai', 'gemini', 'anthropic', 'ollama') */
  readonly name: string;
  /** Streams a chat completion response from the model */
  stream(
    messages: ProviderMessage[],
    callbacks: ProviderStreamCallbacks,
    signal?: AbortSignal
  ): Promise<void>;
}
