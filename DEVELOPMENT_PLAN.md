# IntentUI — Development Plan

> This document is the authoritative guide for implementing IntentUI.
> It covers architecture decisions, dependency choices, phase-by-phase file breakdowns, and verification strategies.
> Keep it updated as the project evolves.

---

## Table of Contents

1. [Tooling & Infrastructure](#1-tooling--infrastructure)
2. [Dependency Map](#2-dependency-map)
3. [Phase 1 — Core Engine & Dynamic Renderer (MVP)](#3-phase-1--core-engine--dynamic-renderer-mvp)
4. [Phase 2 — Composable & Provider Integration](#4-phase-2--composable--provider-integration)
5. [Phase 3 — Developer Experience & Documentation](#5-phase-3--developer-experience--documentation)
6. [Phase 4 — Nuxt 3 Module & UI Kit](#6-phase-4--nuxt-3-module--ui-kit)
7. [Key Technical Challenges](#7-key-technical-challenges)
8. [Testing Strategy](#8-testing-strategy)
9. [Release & Versioning](#9-release--versioning)

---

## 1. Tooling & Infrastructure

### Monorepo

| Tool | Role | Rationale |
|---|---|---|
| **pnpm** | Package manager & workspaces | Strict dependency isolation, fast installs, native workspace protocol |
| **unbuild** | Library bundler (`@intentui/core`, `@intentui/vue`) | Stub mode for instant local dev without rebuild loops; outputs ESM + CJS + `.d.ts` |
| **Vite** | Playground dev server & Vue SFC compilation | Native Vue 3 support, instant HMR |
| **TypeScript 5.x** | Type system | Strict mode, `moduleResolution: "bundler"` |
| **Vitest** | Unit & integration tests | Vite-native, fast, Vue component testing via `@vue/test-utils` |
| **Changesets** | Versioning & changelogs | Standard for pnpm monorepos, independent versioning per package |

### Root Config Files

```
intentui/
├── pnpm-workspace.yaml          # packages: ['packages/*', 'playground']
├── package.json                 # scripts: dev, build, test, lint, changeset
├── tsconfig.base.json           # shared strict TS config
├── vitest.workspace.ts          # multi-project Vitest config
├── .npmrc                       # shamefully-hoist=false, strict-peer-dependencies=true
├── .gitignore
├── LICENSE                      # MIT
├── README.md
└── DEVELOPMENT_PLAN.md          # this file
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
  - 'playground'
```

### `tsconfig.base.json` (shared)

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true
  }
}
```

---

## 2. Dependency Map

### `@intentui/core` (zero framework deps)

| Dependency | Type | Purpose |
|---|---|---|
| `partial-json` | runtime | Parse incomplete/streaming JSON strings tolerantly |
| `zod` | peerDependency | Schema validation (user provides their own version) |
| `zod-to-json-schema` | runtime | Convert Zod schemas → JSON Schema for LLM tool definitions |

### `@intentui/vue`

| Dependency | Type | Purpose |
|---|---|---|
| `@intentui/core` | runtime (workspace) | Core engine |
| `vue` | peerDependency (>=3.4) | Vue 3 framework |

### `playground`

| Dependency | Type | Purpose |
|---|---|---|
| `@intentui/vue` | workspace link | Local dev testing |
| `vue` | runtime | App framework |
| `vite` | devDependency | Dev server |
| `@vitejs/plugin-vue` | devDependency | Vue SFC support |
| `zod` | runtime | Schema definitions for demo components |

---

## 3. Phase 1 — Core Engine & Dynamic Renderer (MVP)

> **Goal**: A working end-to-end flow where a developer registers Vue components with schemas,
> receives a JSON payload (simulated or from an LLM), and IntentUI validates, resolves,
> and renders the correct component with the correct props — including streaming partial updates.

### 3.1 `packages/core`

#### File: `packages/core/src/parser.ts` — Partial JSON Streaming Parser

**Responsibility**: Accept raw string chunks from an LLM stream and produce a "best-effort" parsed JavaScript object after each chunk, even when the JSON is incomplete.

```typescript
// Public API sketch
export interface StreamParserOptions {
  /** Called every time a new usable partial object is available */
  onPartial: (value: unknown) => void;
  /** Called when the final complete object is available */
  onComplete: (value: unknown) => void;
  /** Called on unrecoverable parse errors */
  onError: (error: Error) => void;
}

export function createStreamParser(options: StreamParserOptions): {
  /** Feed a new text chunk into the parser */
  push(chunk: string): void;
  /** Signal end of stream */
  end(): void;
  /** Reset parser state */
  reset(): void;
};
```

**Implementation notes**:
- Internally accumulates a string buffer.
- After each `push()`, attempts `partial-json`'s `parse()` on the buffer.
- If it produces a new value different from the previous one, fires `onPartial`.
- On `end()`, performs a strict `JSON.parse()` and fires `onComplete` or `onError`.
- Must be stateless regarding framework (no Vue, no React imports).

---

#### File: `packages/core/src/registry.ts` — Component Registry & Tools Generator

**Responsibility**: Store component definitions (name → schema + metadata), validate incoming payloads, and generate LLM-compatible tool definitions.

```typescript
import type { ZodObject, ZodRawShape } from 'zod';

// The user provides this when registering components
export interface ComponentDefinition<T extends ZodRawShape = ZodRawShape> {
  /** The actual component reference (opaque to core — could be Vue, React, anything) */
  component: unknown;
  /** Human-readable description for the LLM */
  description: string;
  /** Zod schema defining the component's props */
  schema: ZodObject<T>;
}

export interface RegistryOptions {
  components: Record<string, ComponentDefinition>;
  /** Fallback component when the requested name is not found */
  fallback?: unknown;
}

export interface ResolvedComponent {
  name: string;
  component: unknown;
  props: Record<string, unknown>;
  isValid: boolean;
  errors?: string[];
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

// Public API
export function createRegistry(options: RegistryOptions): {
  /** Resolve a component name + raw props → validated ResolvedComponent */
  resolve(name: string, rawProps: Record<string, unknown>): ResolvedComponent;
  /** Check if a component name exists */
  has(name: string): boolean;
  /** Get list of all registered component names */
  list(): string[];
  /** Generate LLM tool definitions from all registered schemas */
  getToolsDefinition(): ToolDefinition[];
  /** Get the fallback component */
  getFallback(): unknown | undefined;
};
```

**Implementation notes**:
- `resolve()` calls `schema.safeParse(rawProps)`. If valid, returns the component + parsed props. If invalid, returns `isValid: false` with Zod error messages and the fallback component.
- `getToolsDefinition()` iterates all entries, converts each Zod schema via `zod-to-json-schema`, and builds the `ToolDefinition[]` array. Each tool name is derived from the component registry key (e.g., `SalesChart` → `render_sales_chart` or configurable).

---

#### File: `packages/core/src/bridge.ts` — Event & Action Bridge

**Responsibility**: Define a standard protocol for component actions (user interactions) that need to be sent back to the LLM as tool responses.

```typescript
export interface IntentAction {
  /** The component that emitted the action */
  componentName: string;
  /** The event name (e.g., 'submit', 'select', 'click') */
  event: string;
  /** The payload from the component */
  data: unknown;
  /** Timestamp */
  timestamp: number;
}

export interface ActionBridgeOptions {
  /** Called when an action is captured and ready to be sent back */
  onAction?: (action: IntentAction) => void | Promise<void>;
}

export function createActionBridge(options: ActionBridgeOptions): {
  /** Emit an action from a rendered component */
  emit(componentName: string, event: string, data: unknown): void;
  /** Get the history of all emitted actions */
  getHistory(): IntentAction[];
  /** Clear action history */
  clearHistory(): void;
};
```

---

#### File: `packages/core/src/types.ts` — Shared Types

```typescript
/** The shape of a single "intent" payload from the LLM */
export interface IntentPayload {
  /** The component to render */
  component: string;
  /** The props to pass */
  props: Record<string, unknown>;
}

/** A stream of intent payloads */
export interface IntentStreamChunk {
  /** Raw text content (markdown, etc.) — rendered as-is */
  text?: string;
  /** A component intent to render */
  intent?: IntentPayload;
  /** Whether this chunk is the final one */
  done?: boolean;
}

/** Deep partial utility type */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;
```

---

#### File: `packages/core/src/index.ts` — Public Exports

```typescript
export { createStreamParser } from './parser';
export type { StreamParserOptions } from './parser';

export { createRegistry } from './registry';
export type { ComponentDefinition, RegistryOptions, ResolvedComponent, ToolDefinition } from './registry';

export { createActionBridge } from './bridge';
export type { IntentAction, ActionBridgeOptions } from './bridge';

export type { IntentPayload, IntentStreamChunk, DeepPartial } from './types';
```

---

#### File: `packages/core/package.json`

```jsonc
{
  "name": "@intentui/core",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "unbuild",
    "dev": "unbuild --stub",
    "test": "vitest run"
  },
  "peerDependencies": {
    "zod": "^3.23"
  },
  "dependencies": {
    "partial-json": "^0.1.7",
    "zod-to-json-schema": "^3.23"
  }
}
```

---

### 3.2 `packages/vue`

#### File: `packages/vue/src/plugin.ts` — `createIntentUI()` Factory

**Responsibility**: The main entry point for the Vue binding. Wraps `createRegistry` and `createActionBridge` from core and returns the configured IntentUI instance.

```typescript
import { createRegistry, createActionBridge } from '@intentui/core';
import type { ComponentDefinition, ToolDefinition, IntentAction } from '@intentui/core';
import type { Component } from 'vue';

export interface IntentUIOptions {
  components: Record<string, ComponentDefinition & { component: Component }>;
  fallback?: Component | (() => Promise<{ default: Component }>);
}

export interface IntentUIInstance {
  registry: ReturnType<typeof createRegistry>;
  bridge: ReturnType<typeof createActionBridge>;
  getToolsDefinition(): ToolDefinition[];
}

export function createIntentUI(options: IntentUIOptions): IntentUIInstance;
```

---

#### File: `packages/vue/src/IntentRenderer.vue` — Dynamic Rendering Component

**Responsibility**: Receives a reactive stream, resolves each intent payload via the registry, and dynamically renders the matched Vue component using `<component :is>`. Exposes `#loading` and `#error` slots.

**Key implementation details**:
- Uses `defineProps<{ stream: Ref<IntentStreamChunk[]> }>()`.
- Watches `stream` reactively.
- For each `IntentStreamChunk` with an `intent`, calls `registry.resolve()`.
- If streaming and schema validation is partial, renders the `#loading` slot with `{ componentName, partialProps }`.
- If resolved and valid, renders `<component :is="resolved.component" v-bind="resolved.props" />`.
- Captures `@action` / `@submit` events from child components and routes them through `bridge.emit()`.
- On bridge emit, also `$emit('action', intentAction)` to the parent.

**Template structure** (conceptual):

```vue
<template>
  <div class="intent-renderer">
    <template v-for="(chunk, i) in resolvedChunks" :key="i">
      <!-- Plain text content -->
      <div v-if="chunk.text" class="intent-text" v-html="renderMarkdown(chunk.text)" />

      <!-- Component intent -->
      <template v-if="chunk.intent">
        <!-- Loading state (streaming, not yet valid) -->
        <slot v-if="chunk.streaming" name="loading"
          :component-name="chunk.intent.component"
          :partial-props="chunk.partialProps"
        >
          <div class="intent-skeleton">Loading {{ chunk.intent.component }}...</div>
        </slot>

        <!-- Error state (schema validation failed) -->
        <slot v-else-if="chunk.error" name="error"
          :error="chunk.error"
          :raw-payload="chunk.intent.props"
        >
          <div class="intent-error">{{ chunk.error.message }}</div>
        </slot>

        <!-- Rendered component -->
        <component
          v-else
          :is="chunk.resolved.component"
          v-bind="chunk.resolved.props"
          @action="(e, d) => onComponentAction(chunk.intent.component, e, d)"
          @submit="(d) => onComponentAction(chunk.intent.component, 'submit', d)"
        />
      </template>
    </template>
  </div>
</template>
```

---

#### File: `packages/vue/src/useIntentChat.ts` — Chat Composable

**Responsibility**: Manages the full chat lifecycle — sending prompts to the API, receiving streaming responses, decoding them with the core `StreamParser`, and producing a reactive `aiStream` ref.

```typescript
import { ref, type Ref } from 'vue';
import { createStreamParser } from '@intentui/core';
import type { IntentStreamChunk, IntentAction } from '@intentui/core';

export interface UseIntentChatOptions {
  /** API endpoint that returns streaming intent payloads */
  api: string;
  /** HTTP headers for the API request */
  headers?: Record<string, string>;
  /** Called when an action from a rendered component is completed */
  onActionComplete?: (action: IntentAction) => void | Promise<void>;
}

export interface UseIntentChatReturn {
  /** Reactive stream of intent chunks for IntentRenderer */
  aiStream: Ref<IntentStreamChunk[]>;
  /** Send a user prompt to the API */
  sendPrompt: (message: string) => Promise<void>;
  /** Handle an action emitted by a rendered component */
  handleComponentAction: (action: IntentAction) => void;
  /** Whether the stream is currently active */
  isStreaming: Ref<boolean>;
  /** Any error that occurred */
  error: Ref<Error | null>;
}

export function useIntentChat(options: UseIntentChatOptions): UseIntentChatReturn;
```

**Implementation notes**:
- `sendPrompt()` calls `fetch(options.api, { method: 'POST', body, ... })` and reads `response.body` as a `ReadableStream`.
- Pipes text chunks into `createStreamParser`, which calls `onPartial` → updates `aiStream.value` reactively.
- This triggers `IntentRenderer` to update in real-time.

---

#### File: `packages/vue/src/useIntentUI.ts` — Low-Level Composable

**Responsibility**: A lower-level composable for non-chat use cases (canvas UIs, dashboard builders, manual control).

```typescript
export interface UseIntentUIOptions {
  onAction?: (eventName: string, payload: unknown) => void | Promise<void>;
}

export interface UseIntentUIReturn {
  renderComponent: (name: string, props: Record<string, unknown>) => ResolvedComponent;
  isStreaming: Ref<boolean>;
  currentPayload: Ref<IntentPayload | null>;
  emitAction: (event: string, data: unknown) => void;
}

export function useIntentUI(options: UseIntentUIOptions): UseIntentUIReturn;
```

---

#### File: `packages/vue/src/index.ts` — Public Exports

```typescript
export { createIntentUI } from './plugin';
export type { IntentUIOptions, IntentUIInstance } from './plugin';

export { default as IntentRenderer } from './IntentRenderer.vue';

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
  DeepPartial,
} from '@intentui/core';
```

---

#### File: `packages/vue/package.json`

```jsonc
{
  "name": "@intentui/vue",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "unbuild",
    "dev": "unbuild --stub",
    "test": "vitest run"
  },
  "peerDependencies": {
    "vue": ">=3.4.0",
    "zod": "^3.23"
  },
  "dependencies": {
    "@intentui/core": "workspace:*"
  }
}
```

---

### 3.3 `playground`

A minimal Vite + Vue 3 app that demonstrates the full flow with **mock/simulated LLM responses** (no real API key needed for dev).

**Key files**:

| File | Purpose |
|---|---|
| `playground/src/main.ts` | Vue app setup, IntentUI plugin registration |
| `playground/src/App.vue` | Chat UI with `<IntentRenderer>` |
| `playground/src/intent.config.ts` | Component registry with sample schemas |
| `playground/src/components/SalesChart.vue` | Demo chart component |
| `playground/src/components/BookingCard.vue` | Demo booking card component |
| `playground/src/components/DefaultSkeleton.vue` | Skeleton placeholder |
| `playground/src/mock/stream.ts` | Simulated LLM streaming responses for local dev |

The mock stream simulates real LLM streaming by sending JSON chunks character-by-character with configurable delay, allowing full testing of partial parsing and skeleton transitions without needing an API key.

---

## 4. Phase 2 — Composable & Provider Integration

> **Goal**: Replace the mock stream with real LLM providers and implement the full agentic round-trip loop.

### 4.1 Provider Abstraction (`packages/core`)

#### File: `packages/core/src/providers/types.ts`

```typescript
export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ProviderOptions {
  model: string;
  apiKey?: string;
  baseURL?: string;
  tools?: ToolDefinition[];
  temperature?: number;
}

export interface ProviderStreamCallbacks {
  onChunk: (chunk: IntentStreamChunk) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface Provider {
  name: string;
  stream(messages: ProviderMessage[], callbacks: ProviderStreamCallbacks): Promise<void>;
}
```

#### Provider Implementations

| File | Provider | Notes |
|---|---|---|
| `packages/core/src/providers/openai.ts` | OpenAI | Chat Completions API with `tools` parameter, SSE streaming |
| `packages/core/src/providers/gemini.ts` | Google Gemini | Gemini API with function calling |
| `packages/core/src/providers/anthropic.ts` | Anthropic Claude | Messages API with tool use |
| `packages/core/src/providers/ollama.ts` | Ollama (local) | Compatible with OpenAI format, custom `baseURL` |

### 4.2 Agentic Round-Trip (`packages/vue`)

Update `useIntentChat` to support the full loop:

```
User prompt → LLM → Tool Call (render component) → User interacts →
@action emitted → Tool Response sent back → LLM continues → ...
```

The key addition is `handleComponentAction` automatically constructing a `tool` role message and re-calling the provider's `stream()` method.

### 4.3 History & State Persistence

- `useIntentChat` maintains a reactive `messages: Ref<ProviderMessage[]>` array.
- Optionally persist to `localStorage` or a custom adapter via `persistence` option.
- Component state (e.g., a form's current values) is tracked via a `componentState` Map keyed by render instance ID.

---

## 5. Phase 3 — Developer Experience & Documentation

> **Goal**: Make IntentUI easy to adopt, well-documented, and fully tested.

### 5.1 Playground Expansion

Transform the basic playground into a rich interactive demo with multiple scenarios:

| Scenario | Components Used | Demonstrates |
|---|---|---|
| **Analytics Dashboard** | `SalesChart`, `MetricCard`, `DataTable` | Multi-component rendering, live data |
| **E-commerce Checkout** | `ProductCard`, `CartSummary`, `CheckoutForm` | Multi-step form wizard, agentic loop |
| **Booking System** | `BookingCard`, `CalendarPicker`, `ConfirmationCard` | Round-trip actions, state persistence |

Each scenario should work with both mock streams and real API keys (toggle via environment variables).

### 5.2 VitePress Documentation (`docs/`)

| Section | Content |
|---|---|
| **Getting Started** | Install, quick start, first component in 5 minutes |
| **Guide** | Concepts, registry, streaming, actions, providers |
| **API Reference** | Auto-generated from TSDoc + manual examples |
| **Examples** | Embedded playground snippets |
| **FAQ** | Common issues, migration from React tools |

### 5.3 Test Suite

See [Testing Strategy](#8-testing-strategy) below for details.

---

## 6. Phase 4 — Nuxt 3 Module, UI Kit & Directory Auto-Discovery

### 6.1 `@intentui/nuxt` (`packages/nuxt`)

A zero-config Nuxt 3 module that:
- Auto-imports `IntentRenderer`, `useIntentChat`, `useIntentUI`.
- Scans `~/components/intent/` directory for components and auto-registers them.
- Provides server-side API routes for proxying LLM calls (keeps API keys on the server).
- Supports SSR-compatible streaming (Nuxt `useAsyncData` + Suspense integration).

### 6.2 UI Kit (`packages/ui-kit`)

Optional, headless-first component library with sensible defaults:
- `IntentChart`: Interactive charts (bar, line, donut) with tool calling schemas.
- `IntentTable`: Filterable, sortable data table with pagination.
- `IntentMetricCard`: KPI metric cards with trend indicators.
- `IntentForm`: Dynamic step form wizard.
- `IntentConfirmation`: Dialog / card for transactional confirmations.

### 6.3 Directory Auto-Discovery & Auto-Registration (Zero-Boilerplate)

To eliminate manual component registration, IntentUI provides automatic directory scanning for both Vite (Vue 3) and Nuxt 3 projects.

#### How It Works

Developers drop their Vue components into a designated folder (e.g. `src/components/intent/` or `~/components/intent/`). IntentUI automatically discovers them, extracts their schemas and descriptions, and builds the component registry and LLM tool definitions with zero boilerplate.

#### Component Definition Conventions

Developers can define a component's schema in one of two ways:

##### Option A: Exported `intent` Definition (Recommended)
```vue
<!-- components/intent/SalesChart.vue -->
<template>
  <div class="chart">...</div>
</template>

<script lang="ts">
import { z } from 'zod';
import { defineIntent } from '@intentui/vue';

export const intent = defineIntent({
  description: 'Interactive sales chart showing revenue breakdown over time',
  schema: z.object({
    title: z.string(),
    timeframe: z.enum(['daily', 'weekly', 'monthly']),
    metrics: z.array(z.object({ label: z.string(), value: z.number() })),
  }),
});
</script>

<script setup lang="ts">
// Normal component logic...
</script>
```

##### Option B: Companion `.schema.ts` File
```
components/intent/
├── SalesChart.vue
├── SalesChart.schema.ts    # export const schema = z.object({...}); export const description = "...";
├── BookingCard.vue
└── BookingCard.schema.ts
```

#### Vite / Vue 3 Implementation (`import.meta.glob`)
```typescript
import { createIntentUI, autoDiscoverComponents } from '@intentui/vue';

export const intentUI = createIntentUI({
  // Auto-scans all .vue files in the directory
  components: autoDiscoverComponents(
    import.meta.glob('./components/intent/*.vue', { eager: true })
  ),
});
```

#### Nuxt 3 Implementation (Zero Config)
The `@intentui/nuxt` module automatically registers a Nuxt hook that scans `~/components/intent/` at build/dev time:
- Automatically registers all `.vue` components in the directory.
- Auto-generates server-side LLM tool definitions.
- Auto-imports composables and `<IntentRenderer>` across the entire Nuxt application.

---

## 7. Key Technical Challenges

### 7.1 Partial JSON Parsing

**Problem**: LLMs stream tokens one-by-one, producing incomplete JSON at every step (e.g., `{ "title": "Sa`). We need to extract a usable partial object from this.

**Solution**: Use the `partial-json` library which is specifically designed for this. It handles:
- Missing closing brackets/braces
- Incomplete string values
- Partial arrays

**Edge cases to test**:
- Empty stream → no crash
- Stream with only text, no JSON
- Nested objects streaming (partial inner objects)
- Arrays with partial elements
- Unicode characters split across chunks
- Extremely fast chunks (batch processing)
- Extremely slow chunks (debounce/throttle updates)

### 7.2 Schema Validation During Streaming

**Problem**: During streaming, props are incomplete. Zod strict validation would fail on every partial update.

**Solution**: Two-phase validation:
1. **During streaming**: Use `schema.partial().safeParse()` (Zod's `.partial()`) to accept incomplete data. Pass `partialProps` to the `#loading` slot.
2. **On stream complete**: Use `schema.safeParse()` for full validation. Only render the actual component if this passes, otherwise render the `#error` slot.

### 7.3 Event Naming Conventions

**Problem**: Components may emit arbitrary event names. We need a consistent protocol.

**Solution**: Define a standard set of semantic events:
- `@intent:action` — generic user action
- `@intent:submit` — form submission
- `@intent:select` — item selection
- `@intent:dismiss` — user dismisses the component

Components can also emit custom events, which are captured generically.

### 7.4 Stream Format

**Problem**: Different LLM providers return different stream formats (SSE, NDJSON, raw text chunks).

**Solution**: The `Provider` abstraction normalizes all formats into `IntentStreamChunk` objects. Each provider implementation handles its own transport:
- **OpenAI**: SSE (`text/event-stream`), parse `data: {...}` lines, extract `tool_calls[0].function.arguments` delta
- **Gemini**: SSE, extract `functionCall` from parts
- **Anthropic**: SSE, extract `content_block` with `type: "tool_use"` and `partial_json` input delta
- **Ollama**: NDJSON, OpenAI-compatible format

---

## 8. Testing Strategy

### 8.1 Unit Tests (`packages/core`)

| Module | Test Focus |
|---|---|
| `parser.ts` | Partial JSON parsing: empty, complete, nested, edge cases, error recovery |
| `registry.ts` | Component registration, schema validation (pass/fail), tool definition generation, fallback resolution |
| `bridge.ts` | Action emission, history tracking, async callback handling |

**Tool**: Vitest with plain TypeScript — no DOM needed.

### 8.2 Component Tests (`packages/vue`)

| Component / Composable | Test Focus |
|---|---|
| `IntentRenderer.vue` | Renders correct component from payload, shows loading slot during streaming, shows error slot on validation failure, emits actions |
| `useIntentChat.ts` | Sends fetch requests, processes mock streams, updates reactive state, handles errors |
| `useIntentUI.ts` | Resolves components, emits actions, tracks streaming state |
| `plugin.ts` | Creates instance correctly, `getToolsDefinition()` output matches expected schema |

**Tools**: Vitest + `@vue/test-utils` + `happy-dom`.

### 8.3 Integration Tests

- End-to-end flow with mock server: send prompt → receive stream → render component → emit action → verify round-trip.
- Use `msw` (Mock Service Worker) to simulate streaming API responses.

### 8.4 Test Commands

```bash
# Run all tests
pnpm test

# Run core tests only
pnpm --filter @intentui/core test

# Run vue tests only
pnpm --filter @intentui/vue test

# Watch mode during development
pnpm --filter @intentui/core test -- --watch
```

---

## 9. Release & Versioning

### Strategy

- **Independent versioning** per package using Changesets.
- **Semver**: `0.x.y` during pre-1.0 development (breaking changes allowed in minor bumps).
- **npm scoped packages**: `@intentui/core`, `@intentui/vue`, `@intentui/nuxt`.

### Release Workflow

```bash
# 1. Create a changeset describing your changes
pnpm changeset

# 2. Version bump (updates package.json + CHANGELOG.md)
pnpm changeset version

# 3. Build all packages
pnpm build

# 4. Publish to npm
pnpm changeset publish
```

### CI/CD (future)

- GitHub Actions: lint → typecheck → test → build on every PR.
- Auto-publish on merge to `main` with changeset bot.

---

## Implementation Order & Progress

### ✅ Phase 1: Core Engine & Dynamic Renderer (Completed)
- [x] Step 1: Monorepo scaffolding (root configs, pnpm workspace, tsconfig, vitest)
- [x] Step 2: `@intentui/core` — `types.ts` (shared types, zero deps)
- [x] Step 3: `@intentui/core` — `parser.ts` + 9 unit tests (partial JSON streaming)
- [x] Step 4: `@intentui/core` — `registry.ts` + 14 unit tests (Zod schema & tool defs)
- [x] Step 5: `@intentui/core` — `bridge.ts` + 7 unit tests (event bridge & history)
- [x] Step 6: `@intentui/core` — `index.ts` & build verification (dual ESM/CJS + `.d.ts`)
- [x] Step 7: `@intentui/vue` — `plugin.ts` (`createIntentUI` factory)
- [x] Step 8: `@intentui/vue` — `IntentRenderer.ts` + 9 component tests
- [x] Step 9: `@intentui/vue` — `useIntentChat.ts` (chat composable)
- [x] Step 10: `@intentui/vue` — `useIntentUI.ts` (canvas composable)
- [x] Step 11: `@intentui/vue` — `index.ts` & build verification (dual ESM/CJS + `.d.ts`)
- [x] Step 12: Playground — mock stream + SalesChart & BookingCard demo + App.vue
- [x] Step 13: Browser verification — 100% passed (39 tests + live browser interaction)

---

### ⏳ Phase 2: Composable & Provider Integration (In Progress)
- [ ] Step 14: Provider interface & protocol (`packages/core/src/providers/types.ts`)
- [ ] Step 15: OpenAI Provider (`packages/core/src/providers/openai.ts`) + unit tests
- [ ] Step 16: Gemini Provider (`packages/core/src/providers/gemini.ts`) + unit tests
- [ ] Step 17: Anthropic Provider (`packages/core/src/providers/anthropic.ts`) + unit tests
- [ ] Step 18: Ollama Provider (`packages/core/src/providers/ollama.ts`) + unit tests
- [ ] Step 19: Provider exports and barrel in `@intentui/core`
- [ ] Step 20: Agentic round-trip loop in `useIntentChat` & history persistence
- [ ] Step 21: Playground multi-provider UI (mock / OpenAI / Gemini / Anthropic / Ollama)
- [ ] Step 22: Vitest provider tests & end-to-end browser validation

---

> **Next action**: Execute Phase 2 starting with Step 14 (Provider abstraction).
