import { describe, it, expect, vi } from 'vitest';
import { createGeminiProvider } from '../../src/providers/gemini';
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

describe('createGeminiProvider', () => {
  it('should stream text and function calls from Gemini SSE format', async () => {
    const sseResponse = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Here is the chart:"}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"render_sales_chart","args":{"title":"Q1 Revenue"}}}]}}]}\n\n',
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createMockSSEStream(sseResponse),
    });

    const provider = createGeminiProvider({
      model: 'gemini-2.0-flash',
      apiKey: 'test-gemini-key',
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
    expect(receivedChunks).toHaveLength(2);
    expect(receivedChunks[0]?.text).toBe('Here is the chart:');
    expect(receivedChunks[1]?.intent?.component).toBe('SalesChart');
    expect(receivedChunks[1]?.intent?.props).toEqual({ title: 'Q1 Revenue' });
  });
});
