import { defineEventHandler, readBody, setHeader, createError } from 'h3';
import {
  createOpenAIProvider,
  createGeminiProvider,
  createAnthropicProvider,
  createOllamaProvider,
  type ProviderMessage,
  type ToolDefinition,
  type LLMProvider,
} from '@intentui/core';

// Helper to access Nuxt runtime config in server handlers
declare function useRuntimeConfig(): {
  intentui?: {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseURL?: string;
  };
};

/**
 * Nitro server endpoint for proxying Generative UI streaming requests securely.
 * Reads API keys safely from server environment variables without client exposure.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    messages?: ProviderMessage[];
    prompt?: string;
    tools?: ToolDefinition[];
    model?: string;
    provider?: 'openai' | 'gemini' | 'anthropic' | 'ollama';
  }>(event);

  const runtimeConfig = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : {};
  const serverConfig = runtimeConfig.intentui || {};

  const providerType = body.provider || serverConfig.provider || 'openai';
  const apiKey = serverConfig.apiKey || process.env.INTENTUI_API_KEY || process.env.OPENAI_API_KEY || '';
  const model = body.model || serverConfig.model || '';
  const baseURL = serverConfig.baseURL;

  // Build message list
  const messages: ProviderMessage[] = body.messages || [];
  if (body.prompt && messages.length === 0) {
    messages.push({ role: 'user', content: body.prompt });
  }

  if (messages.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing messages or prompt in request body',
    });
  }

  // Create configured provider
  let provider: LLMProvider;
  switch (providerType) {
    case 'gemini':
      provider = createGeminiProvider({
        apiKey: apiKey || process.env.GEMINI_API_KEY,
        model: model || 'gemini-2.0-flash',
        tools: body.tools,
      });
      break;
    case 'anthropic':
      provider = createAnthropicProvider({
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
        model: model || 'claude-3-5-sonnet-20241022',
        tools: body.tools,
      });
      break;
    case 'ollama':
      provider = createOllamaProvider({
        host: baseURL || process.env.OLLAMA_HOST || 'http://localhost:11434',
        model: model || 'llama3.1',
        tools: body.tools,
      });
      break;
    case 'openai':
    default:
      provider = createOpenAIProvider({
        apiKey: apiKey || process.env.OPENAI_API_KEY,
        baseURL: baseURL || undefined,
        model: model || 'gpt-4o',
        tools: body.tools,
      });
      break;
  }

  // Set SSE streaming headers
  setHeader(event, 'content-type', 'text/event-stream');
  setHeader(event, 'cache-control', 'no-cache, no-transform');
  setHeader(event, 'connection', 'keep-alive');
  setHeader(event, 'x-accel-buffering', 'no');

  // Stream chunks back to client
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        await provider.stream(messages, {
          onChunk(chunk) {
            const payload = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          },
          onComplete() {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
          onError(err) {
            const errorPayload = `data: ${JSON.stringify({ error: err.message })}\n\n`;
            controller.enqueue(encoder.encode(errorPayload));
            controller.close();
          },
        });
      } catch (err: any) {
        const errorPayload = `data: ${JSON.stringify({ error: err?.message || 'Stream error' })}\n\n`;
        controller.enqueue(encoder.encode(errorPayload));
        controller.close();
      }
    },
  });

  return stream;
});
