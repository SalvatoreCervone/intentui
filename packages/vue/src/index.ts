// Plugin
export { createIntentUI } from './plugin';
export type { IntentUIOptions, IntentUIInstance, VueComponentDefinition } from './plugin';

// Components
export { IntentRenderer, default as IntentRendererDefault } from './IntentRenderer';
export type { ProcessedChunk } from './IntentRenderer';

// Composables
export { useIntentChat } from './useIntentChat';
export type { UseIntentChatOptions, UseIntentChatReturn } from './useIntentChat';

export { useIntentUI } from './useIntentUI';
export type { UseIntentUIOptions, UseIntentUIReturn } from './useIntentUI';

// Re-export core types for convenience
export type {
  IntentPayload,
  IntentStreamChunk,
  IntentAction,
  ComponentDefinition,
  ToolDefinition,
  ResolvedComponent,
  DeepPartial,
  Registry,
  ActionBridge,
} from '@intentui/core';
