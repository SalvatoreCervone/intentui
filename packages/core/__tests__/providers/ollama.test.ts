import { describe, it, expect, vi } from 'vitest';
import { createOllamaProvider } from '../../src/providers/ollama';

describe('OllamaProvider', () => {
  it('should initialize with default host and model', () => {
    const provider = createOllamaProvider({
      model: 'llama3.1',
    });

    expect(provider.name).toBe('ollama');
    expect(typeof provider.stream).toBe('function');
  });

  it('should use custom host when provided', () => {
    const provider = createOllamaProvider({
      host: 'http://192.168.1.100:11434',
      model: 'mistral',
    });

    expect(provider.name).toBe('ollama');
  });

  it('should stream chunks via OpenAI compatible transport', async () => {
    const mockChunks = [
      'data: {"choices":[{"delta":{"content":"Ciao"}}]}\n\n',
      'data: [DONE]\n\n',
    ];

    const mockStream = new ReadableStream({
      start(controller) {
        for (const chunk of mockChunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: mockStream,
      })
    );

    const provider = createOllamaProvider({
      host: 'http://localhost:11434',
      model: 'llama3.1',
    });

    const received: string[] = [];
    let completed = false;

    await provider.stream(
      [{ role: 'user', content: 'Test' }],
      {
        onChunk: (chunk) => {
          if (chunk.text) received.push(chunk.text);
        },
        onComplete: () => {
          completed = true;
        },
        onError: () => {},
      }
    );

    expect(received).toEqual(['Ciao']);
    expect(completed).toBe(true);

    vi.restoreAllMocks();
  });
});
