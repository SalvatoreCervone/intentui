// Plugin
export { createIntentUI } from './plugin';
export type { IntentUIOptions, IntentUIInstance, VueComponentDefinition } from './plugin';

// Discovery
export { autoDiscoverComponents } from './discovery';
export type { AutoDiscoverOptions } from './discovery';

// Core defineIntent helper re-export
export { defineIntent } from '@intentui-vue/core';
export type { IntentDefinition } from '@intentui-vue/core';

// UI-Kit Component Suite & Pre-configured Registry
export {
  intentUIComponents,
  MetricCard,
  metricCardIntent,
  DataTable,
  dataTableIntent,
  FormWizard,
  formWizardIntent,
  ConfirmationCard,
  confirmationCardIntent,
  ActionStagingCard,
  actionStagingCardIntent,
} from '@intentui-vue/ui-kit';

// Components
export { IntentRenderer, default as IntentRendererDefault } from './IntentRenderer';
export type { ProcessedChunk } from './IntentRenderer';

// Composables
export { useIntentChat } from './useIntentChat';
export type { UseIntentChatOptions, UseIntentChatReturn } from './useIntentChat';

export { useIntentUI } from './useIntentUI';
export type { UseIntentUIOptions, UseIntentUIReturn } from './useIntentUI';

// Re-export providers & core types for convenience
export {
  createProvider,
  createOpenAIProvider,
  createGeminiProvider,
  createAnthropicProvider,
  createOllamaProvider,
  createWebLLMProvider,
  computeStateDiff,
} from '@intentui-vue/core';

export type {
  IntentPayload,
  IntentStreamChunk,
  IntentAction,
  IntentStateDiff,
  ComponentDefinition,
  ToolDefinition,
  ResolvedComponent,
  DeepPartial,
  Registry,
  ActionBridge,
  LLMProvider,
  ProviderMessage,
  ProviderOptions,
  ProviderStreamCallbacks,
  ProviderType,
  CreateProviderConfig,
  OpenAIOptions,
  GeminiOptions,
  AnthropicOptions,
  OllamaOptions,
  WebLLMOptions,
  WebLLMProgressReport,
} from '@intentui-vue/core';

