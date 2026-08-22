import { describe, it, expect, vi } from 'vitest';
import { createWebLLMProvider } from '../../src/providers/webllm';
import { createProvider } from '../../src/providers';
import type { ProviderStreamCallbacks } from '../../src/providers/types';

describe('WebLLM Provider', () => {
  it('should stream text chunks from an in-browser WebLLM engine', async () => {
    const mockEngine = {
      chat: {
        completions: {
          create: vi.fn(async function* () {
            yield { choices: [{ delta: { content: 'Hello ' } }] };
            yield { choices: [{ delta: { content: 'from WebGPU!' }, finish_reason: 'stop' }] };
          }),
        },
      },
    };

    const provider = createWebLLMProvider({
      model: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      engine: mockEngine,
    });

    const chunks: string[] = [];
    const callbacks: ProviderStreamCallbacks = {
      onChunk: (chunk) => {
        if (chunk.text) chunks.push(chunk.text);
      },
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    await provider.stream([{ role: 'user', content: 'Hi' }], callbacks);

    expect(chunks.join('')).toBe('Hello from WebGPU!');
    expect(callbacks.onComplete).toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it('should stream and decode tool call intent payloads from WebLLM engine', async () => {
    const mockEngine = {
      chat: {
        completions: {
          create: vi.fn(async function* () {
            yield {
              choices: [
                {
                  delta: {
                    tool_calls: [
                      {
                        function: {
                          name: 'render_sales_chart',
                          arguments: '{"title": "Q3 Sales", ',
                        },
                      },
                    ],
                  },
                },
              ],
            };
            yield {
              choices: [
                {
                  delta: {
                    tool_calls: [
                      {
                        function: {
                          arguments: '"revenue": 45000}',
                        },
                      },
                    ],
                  },
                  finish_reason: 'tool_calls',
                },
              ],
            };
          }),
        },
      },
    };

    const provider = createWebLLMProvider({
      model: 'Qwen2.5-Coder-1.5B',
      engine: mockEngine,
    });

    const receivedIntents: any[] = [];
    const callbacks: ProviderStreamCallbacks = {
      onChunk: (chunk) => {
        if (chunk.intent) receivedIntents.push(chunk.intent);
      },
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    await provider.stream([{ role: 'user', content: 'Show sales' }], callbacks);

    expect(receivedIntents.length).toBeGreaterThan(0);
    const lastIntent = receivedIntents[receivedIntents.length - 1];
    expect(lastIntent.component).toBe('SalesChart');
    expect(lastIntent.props.title).toBe('Q3 Sales');
    expect(lastIntent.props.revenue).toBe(45000);
    expect(callbacks.onComplete).toHaveBeenCalled();
  });

  it('should support universal createProvider({ type: "webllm" }) instantiation', () => {
    const provider = createProvider({
      type: 'webllm',
      options: {
        model: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
      },
    });

    expect(provider.name).toBe('webllm');
  });

  it('should report initialization error if engine is unavailable', async () => {
    const provider = createWebLLMProvider({
      model: 'NonExistentModel',
    });

    const callbacks: ProviderStreamCallbacks = {
      onChunk: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    await provider.stream([{ role: 'user', content: 'Hi' }], callbacks);

    expect(callbacks.onError).toHaveBeenCalled();
  });
});
