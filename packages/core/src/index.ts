// Parser
export { createStreamParser } from './parser';
export type { StreamParserOptions, StreamParser } from './parser';

// Registry
export { createRegistry, defineIntent } from './registry';
export type {
  ComponentDefinition,
  IntentDefinition,
  RegistryOptions,
  ResolvedComponent,
  ToolDefinition,
  Registry,
} from './registry';

// Bridge
export { createActionBridge } from './bridge';
export type { IntentAction, ActionBridgeOptions, ActionBridge } from './bridge';

// Providers
export * from './providers';

// Types
export { computeStateDiff } from './types';
export type { IntentPayload, IntentStreamChunk, DeepPartial, IntentStateDiff } from './types';

