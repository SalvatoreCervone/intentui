import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { defineComponent, h } from 'vue';
import { createIntentUI } from '../src/plugin';
import { useIntentChat } from '../src/useIntentChat';
import type { LLMProvider, ProviderMessage, ProviderStreamCallbacks } from '@intentui-vue/core';

const MockComponent = defineComponent({
  name: 'MockComponent',
  props: { title: String },
  setup: (props) => () => h('div', props.title),
});

describe('useIntentChat with Provider & Agentic Loop', () => {
  it('should send prompt and process stream chunks from a provider', async () => {
    const mockProvider: LLMProvider = {
      name: 'mock',
      stream: vi.fn(async (messages: ProviderMessage[], callbacks: ProviderStreamCallbacks) => {
        callbacks.onChunk({ text: 'Sure, here is your component:' });
        callbacks.onChunk({
          intent: { component: 'Card', props: { title: 'Hello World' } },
          done: true,
        });
        callbacks.onComplete();
      }),
    };

    const intentUI = createIntentUI({
      components: {
        Card: {
          component: MockComponent,
          description: 'A mock card',
          schema: z.object({ title: z.string() }),
        },
      },
    });

    const chat = useIntentChat({
      intentUI,
      provider: mockProvider,
    });

    await chat.sendPrompt('Create a card');

    expect(chat.messages.value).toHaveLength(2);
    expect(chat.messages.value[0]?.role).toBe('user');
    expect(chat.messages.value[0]?.content).toBe('Create a card');
    expect(chat.messages.value[1]?.role).toBe('assistant');
    expect(chat.aiStream.value).toHaveLength(2);
    expect(chat.isStreaming.value).toBe(false);
  });

  it('should automatically continue conversation on handleComponentAction (agentic loop)', async () => {
    let callCount = 0;
    const mockProvider: LLMProvider = {
      name: 'mock',
      stream: vi.fn(async (messages: ProviderMessage[], callbacks: ProviderStreamCallbacks) => {
        callCount++;
        if (callCount === 1) {
          callbacks.onChunk({
            intent: { component: 'Card', props: { title: 'First Step' } },
            done: true,
          });
        } else if (callCount === 2) {
          callbacks.onChunk({
            text: 'Thank you! Step 2 is now complete.',
            done: true,
          });
        }
        callbacks.onComplete();
      }),
    };

    const intentUI = createIntentUI({
      components: {
        Card: {
          component: MockComponent,
          description: 'Card',
          schema: z.object({ title: z.string() }),
        },
      },
    });

    const chat = useIntentChat({
      intentUI,
      provider: mockProvider,
      autoContinueOnAction: true,
    });

    // 1. Initial prompt
    await chat.sendPrompt('Start wizard');
    expect(callCount).toBe(1);

    // 2. User clicks an action in the rendered component
    await chat.handleComponentAction('Card', 'submit', { step1Answer: 'Yes' });

    // 3. Provider was re-invoked with the tool response
    expect(callCount).toBe(2);
    expect(chat.messages.value.some((m) => m.role === 'tool')).toBe(true);
  });

  it('should patch local props with handleStateChange and notify onStateDiffComplete', async () => {
    const onStateDiffComplete = vi.fn();
    const mockProvider: LLMProvider = {
      name: 'mock',
      stream: vi.fn(async (_messages, callbacks) => {
        callbacks.onChunk({
          intent: { component: 'Card', props: { title: 'Initial Title' } },
          done: true,
        });
        callbacks.onComplete();
      }),
    };

    const intentUI = createIntentUI({
      components: {
        Card: {
          component: MockComponent,
          description: 'Card',
          schema: z.object({ title: z.string() }),
        },
      },
    });

    const chat = useIntentChat({
      intentUI,
      provider: mockProvider,
      onStateDiffComplete,
    });

    await chat.sendPrompt('Show card');
    expect(chat.aiStream.value[0]?.intent?.props.title).toBe('Initial Title');

    // Mutate state locally via handleStateChange
    await chat.handleStateChange('Card', { title: 'Updated Title' }, { title: 'Initial Title' });

    // Reactive props in aiStream should be patched immediately
    expect(chat.aiStream.value[0]?.intent?.props.title).toBe('Updated Title');
    expect(onStateDiffComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        componentName: 'Card',
        diff: { title: 'Updated Title' },
      })
    );
  });
});

