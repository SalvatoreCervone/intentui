import { defineComponent, computed, h, type PropType, type Component, type VNode } from 'vue';
import type { IntentStreamChunk, ResolvedComponent, Registry, ActionBridge } from '@intentui/core';

/**
 * A processed chunk ready for rendering.
 */
export interface ProcessedChunk {
  type: 'text' | 'loading' | 'error' | 'component';
  text?: string;
  componentName?: string;
  component?: Component;
  props?: Record<string, unknown>;
  partialProps?: Record<string, unknown>;
  error?: { message: string };
  rawPayload?: Record<string, unknown>;
}

/**
 * IntentRenderer — dynamic rendering component for IntentUI.
 *
 * Receives a stream of intent chunks, validates each against the component
 * registry, and renders matching Vue components dynamically with props.
 * Handles loading states during streaming and fallback error states.
 */
export const IntentRenderer = defineComponent({
  name: 'IntentRenderer',
  props: {
    /** The reactive stream of intent chunks */
    stream: {
      type: Array as PropType<IntentStreamChunk[]>,
      required: true,
      default: () => [],
    },
    /** The IntentUI registry instance for resolving components */
    registry: {
      type: Object as PropType<Registry>,
      required: true,
    },
    /** The IntentUI action bridge for routing actions */
    bridge: {
      type: Object as PropType<ActionBridge>,
      required: true,
    },
  },
  emits: {
    /** Emitted when a user interacts with a rendered component */
    action: (_componentName: string, _event: string, _data: unknown) => true,
  },
  setup(props, { emit, slots }) {
    const processedChunks = computed<ProcessedChunk[]>(() => {
      const chunks: ProcessedChunk[] = [];

      for (const chunk of props.stream) {
        if (chunk.text) {
          chunks.push({ type: 'text', text: chunk.text });
        }

        if (chunk.intent) {
          const { component: componentName, props: rawProps } = chunk.intent;

          if (!chunk.done) {
            chunks.push({
              type: 'loading',
              componentName,
              partialProps: rawProps,
            });
            continue;
          }

          const resolved: ResolvedComponent = props.registry.resolve(componentName, rawProps);

          if (resolved.isValid) {
            chunks.push({
              type: 'component',
              componentName,
              component: resolved.component as Component,
              props: resolved.props,
            });
          } else {
            chunks.push({
              type: 'error',
              componentName,
              error: {
                message: resolved.errors?.join('; ') ?? 'Validation failed',
              },
              rawPayload: rawProps,
            });
          }
        }
      }

      return chunks;
    });

    function onComponentAction(componentName: string, event: string, data: unknown): void {
      props.bridge.emit(componentName, event, data);
      emit('action', componentName, event, data);
    }

    return () => {
      const children: VNode[] = [];

      for (const chunk of processedChunks.value) {
        if (chunk.type === 'text' && chunk.text) {
          children.push(h('div', { class: 'intent-text' }, chunk.text));
        } else if (chunk.type === 'loading') {
          if (slots.loading) {
            const slotContent = slots.loading({
              componentName: chunk.componentName,
              partialProps: chunk.partialProps,
            });
            children.push(h('div', { class: 'intent-loading-wrapper' }, slotContent));
          } else {
            children.push(
              h('div', { class: 'intent-skeleton' }, `Loading ${chunk.componentName}...`)
            );
          }
        } else if (chunk.type === 'error') {
          if (slots.error) {
            const slotContent = slots.error({
              error: chunk.error,
              rawPayload: chunk.rawPayload,
            });
            children.push(h('div', { class: 'intent-error-wrapper' }, slotContent));
          } else {
            children.push(
              h(
                'div',
                { class: 'intent-error' },
                `Cannot render component: ${chunk.error?.message ?? 'Unknown error'}`
              )
            );
          }
        } else if (chunk.type === 'component' && chunk.component) {
          children.push(
            h(chunk.component, {
              ...chunk.props,
              onAction: (event: string, data: unknown) =>
                onComponentAction(chunk.componentName!, event, data),
              onSubmit: (data: unknown) =>
                onComponentAction(chunk.componentName!, 'submit', data),
            })
          );
        }
      }

      return h('div', { class: 'intent-renderer' }, children);
    };
  },
});

export default IntentRenderer;
