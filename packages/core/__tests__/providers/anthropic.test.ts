import { describe, it, expect, vi } from 'vitest';
import { createAnthropicProvider } from '../../src/providers/anthropic';
import { createOllamaProvider } from '../../src/providers/ollama';
import { createProvider } from '../../src/providers/index';
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

describe('createAnthropicProvider', () => {
  it('should stream text and tool_use blocks from Anthropic SSE format', async () => {
    const sseResponse = [
      'data: {"type":"content_block_start","content_block":{"type":"text","text":""}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Checking booking..."}}\n\n',
      'data: {"type":"content_block_stop"}\n\n',
      'data: {"type":"content_block_start","content_block":{"type":"tool_use","name":"render_booking_card"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"{\\"hotelName\\":\\"Grand Hotel\\"}"}}\n\n',
      'data: {"type":"content_block_stop"}\n\n',
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createMockSSEStream(sseResponse),
    });

    const provider = createAnthropicProvider({
      model: 'claude-3-5-sonnet',
      apiKey: 'test-claude-key',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const receivedChunks: IntentStreamChunk[] = [];
    const onComplete = vi.fn();
    const onError = vi.fn();

    await provider.stream(
      [{ role: 'user', content: 'Book hotel' }],
      {
        onChunk: (chunk) => receivedChunks.push(chunk),
        onComplete,
        onError,
      }
    );

    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
    expect(receivedChunks.length).toBeGreaterThanOrEqual(2);
    expect(receivedChunks[0]?.text).toBe('Checking booking...');

    const lastChunk = receivedChunks[receivedChunks.length - 1];
    expect(lastChunk?.intent?.component).toBe('BookingCard');
    expect(lastChunk?.intent?.props).toEqual({ hotelName: 'Grand Hotel' });
  });
});

describe('createProvider factory', () => {
  it('should instantiate all supported provider types', () => {
    const openai = createProvider({ type: 'openai', options: { model: 'gpt-4o' } });
    expect(openai.name).toBe('openai');

    const gemini = createProvider({ type: 'gemini', options: { model: 'gemini-2.0-flash' } });
    expect(gemini.name).toBe('gemini');

    const anthropic = createProvider({ type: 'anthropic', options: { model: 'claude-3-5-sonnet' } });
    expect(anthropic.name).toBe('anthropic');

    const ollama = createProvider({ type: 'ollama', options: { model: 'llama3.1' } });
    expect(ollama.name).toBe('ollama');
  });
});
