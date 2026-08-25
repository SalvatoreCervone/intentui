import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { z } from 'zod';
import { createRegistry, createActionBridge, type IntentStreamChunk } from '@intentui-vue/core';
import IntentRenderer from '../src/IntentRenderer';

const MockChart = defineComponent({
  name: 'MockChart',
  props: {
    title: { type: String, required: true },
    value: { type: Number, required: true },
  },
  emits: ['action', 'stateChange'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'mock-chart', 'data-testid': 'chart' }, [
        h('span', { class: 'title' }, props.title),
        h('span', { class: 'value' }, String(props.value)),
        h('button', {
          class: 'action-btn',
          onClick: () => emit('action', 'click', { selected: true }),
        }, 'Click'),
        h('button', {
          class: 'diff-btn',
          onClick: () => emit('stateChange', { value: 999 }, { value: props.value }),
        }, 'Change Value'),
      ]);
  },
});


const MockFallback = defineComponent({
  name: 'MockFallback',
  setup() {
    return () => h('div', { class: 'fallback', 'data-testid': 'fallback' }, 'Fallback');
  },
});

function createTestDeps() {
  const registry = createRegistry({
    components: {
      Chart: {
        component: MockChart,
        description: 'A chart component',
        schema: z.object({
          title: z.string(),
          value: z.number(),
        }),
      },
    },
    fallback: MockFallback,
  });

  const bridge = createActionBridge();

  return { registry, bridge };
}

describe('IntentRenderer', () => {
  it('should render text chunks', () => {
    const { registry, bridge } = createTestDeps();
    const stream: IntentStreamChunk[] = [
      { text: 'Hello, this is a text response.' },
    ];

    const wrapper = mount(IntentRenderer, {
      props: { stream, registry, bridge },
    });

    expect(wrapper.find('.intent-text').text()).toBe('Hello, this is a text response.');
  });

  it('should render a resolved component with valid props', () => {
    const { registry, bridge } = createTestDeps();
    const stream: IntentStreamChunk[] = [
      {
        intent: { component: 'Chart', props: { title: 'Revenue', value: 42 } },
        done: true,
      },
    ];

    const wrapper = mount(IntentRenderer, {
      props: { stream, registry, bridge },
    });

    expect(wrapper.find('[data-testid="chart"]').exists()).toBe(true);
    expect(wrapper.find('.title').text()).toBe('Revenue');
    expect(wrapper.find('.value').text()).toBe('42');
  });

  it('should show loading slot for streaming (non-done) chunks', () => {
    const { registry, bridge } = createTestDeps();
    const stream: IntentStreamChunk[] = [
      {
        intent: { component: 'Chart', props: { title: 'Part' } },
        done: false,
      },
    ];

    const wrapper = mount(IntentRenderer, {
      props: { stream, registry, bridge },
    });

    expect(wrapper.find('.intent-skeleton').exists()).toBe(true);
    expect(wrapper.find('.intent-skeleton').text()).toContain('Chart');
  });

  it('should show error slot for invalid props', () => {
    const { registry, bridge } = createTestDeps();
    const stream: IntentStreamChunk[] = [
      {
        intent: { component: 'Chart', props: { title: 123, value: 'not a number' } },
        done: true,
      },
    ];

    const wrapper = mount(IntentRenderer, {
      props: { stream, registry, bridge },
    });

    expect(wrapper.find('.intent-error').exists()).toBe(true);
  });

  it('should show error slot for unregistered components', () => {
    const { registry, bridge } = createTestDeps();
    const stream: IntentStreamChunk[] = [
      {
        intent: { component: 'NonExistent', props: {} },
        done: true,
      },
    ];

    const wrapper = mount(IntentRenderer, {
      props: { stream, registry, bridge },
    });

    expect(wrapper.find('.intent-error').exists()).toBe(true);
  });

  it('should emit action event when a child component emits action', async () => {
    const { registry, bridge } = createTestDeps();
    const stream: IntentStreamChunk[] = [
      {
        intent: { component: 'Chart', props: { title: 'Test', value: 1 } },
        done: true,
      },
    ];

    const wrapper = mount(IntentRenderer, {
      props: { stream, registry, bridge },
    });

    await wrapper.find('.action-btn').trigger('click');

    const emitted = wrapper.emitted('action');
    expect(emitted).toBeDefined();
    expect(emitted![0]).toEqual(['Chart', 'click', { selected: true }]);
  });

  it('should add action to bridge history when a child component emits action', async () => {
    const { registry, bridge } = createTestDeps();
    const stream: IntentStreamChunk[] = [
      {
        intent: { component: 'Chart', props: { title: 'Test', value: 1 } },
        done: true,
      },
    ];

    mount(IntentRenderer, {
      props: { stream, registry, bridge },
    });

    // Simulate the bridge emission (which happens inside onComponentAction)
    bridge.emit('Chart', 'click', { selected: true });

    const history = bridge.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.componentName).toBe('Chart');
  });

  it('should render multiple chunks (text + component)', () => {
    const { registry, bridge } = createTestDeps();
    const stream: IntentStreamChunk[] = [
      { text: 'Here is your chart:' },
      {
        intent: { component: 'Chart', props: { title: 'Sales', value: 100 } },
        done: true,
      },
    ];

    const wrapper = mount(IntentRenderer, {
      props: { stream, registry, bridge },
    });

    expect(wrapper.find('.intent-text').text()).toBe('Here is your chart:');
    expect(wrapper.find('[data-testid="chart"]').exists()).toBe(true);
  });

  it('should support custom loading slot', () => {
    const { registry, bridge } = createTestDeps();
    const stream: IntentStreamChunk[] = [
      {
        intent: { component: 'Chart', props: { title: 'Part' } },
        done: false,
      },
    ];

    const wrapper = mount(IntentRenderer, {
      props: { stream, registry, bridge },
      slots: {
        loading: ({ componentName }: { componentName: string }) =>
          h('div', { class: 'custom-loading' }, `Custom loading: ${componentName}`),
      },
    });

    expect(wrapper.find('.custom-loading').exists()).toBe(true);
    expect(wrapper.find('.custom-loading').text()).toBe('Custom loading: Chart');
  });

  it('should emit stateDiff event and update bridge state history when child component triggers stateChange', async () => {
    const { registry, bridge } = createTestDeps();
    const stream: IntentStreamChunk[] = [
      {
        intent: { component: 'Chart', props: { title: 'Sales', value: 100 } },
        done: true,
      },
    ];

    const wrapper = mount(IntentRenderer, {
      props: { stream, registry, bridge },
    });

    await wrapper.find('.diff-btn').trigger('click');

    const emitted = wrapper.emitted('stateDiff');
    expect(emitted).toBeDefined();
    expect(emitted![0]).toEqual(['Chart', { value: 999 }, { value: 100 }]);

    const stateHistory = bridge.getStateHistory();
    expect(stateHistory).toHaveLength(1);
    expect(stateHistory[0]?.componentName).toBe('Chart');
    expect(stateHistory[0]?.diff).toEqual({ value: 999 });
  });
});

