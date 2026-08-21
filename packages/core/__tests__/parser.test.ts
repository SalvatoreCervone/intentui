import { describe, it, expect, vi } from 'vitest';
import { createStreamParser } from '../src/parser';

describe('createStreamParser', () => {
  it('should parse a complete JSON object streamed in one chunk', () => {
    const onPartial = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const parser = createStreamParser({ onPartial, onComplete, onError });

    parser.push('{ "title": "Hello", "value": 42 }');
    parser.end();

    expect(onPartial).toHaveBeenCalledWith({ title: 'Hello', value: 42 });
    expect(onComplete).toHaveBeenCalledWith({ title: 'Hello', value: 42 });
    expect(onError).not.toHaveBeenCalled();
  });

  it('should produce partial objects as chunks arrive', () => {
    const partials: unknown[] = [];
    const onComplete = vi.fn();
    const onError = vi.fn();

    const parser = createStreamParser({
      onPartial: (value) => partials.push(JSON.parse(JSON.stringify(value))),
      onComplete,
      onError,
    });

    parser.push('{ "title": "Sa');
    parser.push('les Report"');
    parser.push(', "data": [1, 2');
    parser.push(', 3] }');
    parser.end();

    // Should have received progressive updates
    expect(partials.length).toBeGreaterThanOrEqual(2);

    // First partial should contain at least the partial title
    expect(partials[0]).toHaveProperty('title');

    // Final complete parse should have the full object
    expect(onComplete).toHaveBeenCalledWith({
      title: 'Sales Report',
      data: [1, 2, 3],
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle nested objects in streaming', () => {
    const onPartial = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const parser = createStreamParser({ onPartial, onComplete, onError });

    parser.push('{ "user": { "name": "Al');
    parser.push('ice", "age": 30 }');
    parser.push(', "active": true }');
    parser.end();

    expect(onComplete).toHaveBeenCalledWith({
      user: { name: 'Alice', age: 30 },
      active: true,
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle an empty stream without crashing', () => {
    const onPartial = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const parser = createStreamParser({ onPartial, onComplete, onError });

    parser.end();

    expect(onPartial).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(undefined);
    expect(onError).not.toHaveBeenCalled();
  });

  it('should not fire onPartial if the parsed result has not changed', () => {
    const onPartial = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const parser = createStreamParser({ onPartial, onComplete, onError });

    parser.push('{ "a": 1 }');
    const callCount = onPartial.mock.calls.length;

    // Push whitespace — should NOT trigger a new partial
    parser.push('   ');
    expect(onPartial.mock.calls.length).toBe(callCount);
  });

  it('should handle arrays with partial elements', () => {
    const onPartial = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const parser = createStreamParser({ onPartial, onComplete, onError });

    parser.push('[{"label": "Jan", "value": 10}');
    parser.push(', {"label": "Feb"');
    parser.push(', "value": 20}]');
    parser.end();

    expect(onComplete).toHaveBeenCalledWith([
      { label: 'Jan', value: 10 },
      { label: 'Feb', value: 20 },
    ]);
  });

  it('should reset state and be reusable', () => {
    const onPartial = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const parser = createStreamParser({ onPartial, onComplete, onError });

    parser.push('{ "first": true }');
    parser.end();

    expect(onComplete).toHaveBeenCalledWith({ first: true });

    // Reset and reuse
    parser.reset();
    onComplete.mockClear();

    parser.push('{ "second": true }');
    parser.end();

    expect(onComplete).toHaveBeenCalledWith({ second: true });
    expect(parser.getBuffer()).toBe('{ "second": true }');
  });

  it('should return the current buffer via getBuffer', () => {
    const parser = createStreamParser({
      onPartial: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    });

    parser.push('{ "hello');
    parser.push('": "world" }');

    expect(parser.getBuffer()).toBe('{ "hello": "world" }');
  });

  it('should handle string values with special characters', () => {
    const onComplete = vi.fn();

    const parser = createStreamParser({
      onPartial: vi.fn(),
      onComplete,
      onError: vi.fn(),
    });

    parser.push('{ "text": "Hello, \\\"world\\\"! \\n New line" }');
    parser.end();

    expect(onComplete).toHaveBeenCalledWith({
      text: 'Hello, "world"! \n New line',
    });
  });
});
