import { describe, it, expect, vi } from 'vitest';
import { createOpenAIProvider } from '../../src/providers/openai';
import type { IntentStreamChunk } from '../../src/types';

function createMockSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe('createOpenAIProvider', () => {
  it('should stream text chunks from OpenAI SSE format', async () => {
    const sseResponse = [
      'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"world!"}}]}\n\n',
      'data: [DONE]\n\n',
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createMockSSEStream(sseResponse),
    });

    const provider = createOpenAIProvider({
      model: 'gpt-4o-mini',
      apiKey: 'test-key',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const receivedChunks: IntentStreamChunk[] = [];
    const onComplete = vi.fn();
    const onError = vi.fn();

    await provider.stream(
      [{ role: 'user', content: 'Hi' }],
      {
        onChunk: (chunk) => receivedChunks.push(chunk),
        onComplete,
        onError,
      }
    );

    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
    expect(receivedChunks).toHaveLength(2);
    expect(receivedChunks[0]?.text).toBe('Hello ');
    expect(receivedChunks[1]?.text).toBe('world!');
  });

  it('should stream tool calls and decode component intents', async () => {
    const sseResponse = [
      'data: {"choices":[{"delta":{"tool_calls":[{"function":{"name":"render_sales_chart","arguments":"{\\"title\\":\\"Q1\\"}"}}]}}]}\n\n',
      'data: [DONE]\n\n',
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createMockSSEStream(sseResponse),
    });

    const provider = createOpenAIProvider({
      model: 'gpt-4o-mini',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const receivedChunks: IntentStreamChunk[] = [];
    const onComplete = vi.fn();
    const onError = vi.fn();

    await provider.stream(
      [{ role: 'user', content: 'Show sales' }],
      {
        onChunk: (chunk) => receivedChunks.push(chunk),
        onComplete,
        onError,
      }
    );

    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
    expect(receivedChunks.length).toBeGreaterThanOrEqual(1);

    const lastChunk = receivedChunks[receivedChunks.length - 1];
    expect(lastChunk?.intent?.component).toBe('SalesChart');
    expect(lastChunk?.intent?.props).toEqual({ title: 'Q1' });
  });

  it('should handle API errors cleanly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('Invalid API key'),
    });

    const provider = createOpenAIProvider({
      model: 'gpt-4o',
      apiKey: 'invalid-key',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const onError = vi.fn();
    await provider.stream(
      [{ role: 'user', content: 'Hello' }],
      {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError,
      }
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('401'),
      })
    );
  });
});
