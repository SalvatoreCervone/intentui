# IntentUI ⚡

> **The Intent-Driven Generative UI Toolkit for Vue 3 & Nuxt**
> *Transform AI streams, JSON schemas, and user intentions into rich, native, interactive Vue components.*

[![npm version](https://img.shields.io/npm/v/@intentui/vue?color=0ea5e9&label=npm)](https://www.npmjs.com/package/@intentui/vue)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178c6.svg)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883.svg)](https://vuejs.org/)

---

## Why IntentUI?

Most AI integrations today render a wall of text or static markdown. Meanwhile, the tooling for **Generative UI** — where LLMs produce rich, interactive interfaces on-the-fly — is almost exclusively built for React (Vercel AI SDK, CopilotKit).

**IntentUI fills the gap for the Vue & Nuxt ecosystem.**

The AI doesn't inject arbitrary HTML or JavaScript. Instead, it selects and populates **your own pre-registered Vue components**, validated with schemas, fully consistent with your design system, and rendered progressively during streaming — with zero layout shift.

---

## Key Features

| Feature | Description |
|---|---|
| 🧩 **Component Registry** | Register your own Vue SFCs with Zod / Standard Schema validation. The AI picks and populates — never invents. |
| 🔄 **Streaming & Zero-CLS** | Partial JSON streaming parser updates props reactively in real-time with smooth skeleton transitions. |
| 🔧 **Auto Tool Definitions** | Automatically converts your component registry into tool/function calling specs for OpenAI, Gemini, Anthropic. |
| 🔁 **Agentic Round-Trip** | User actions inside rendered components (`@action`, `@submit`) feed back into the LLM conversation loop. |
| 🛡️ **Type-Safe & Secure** | Full TypeScript, schema-validated props, no raw HTML injection. |
| 💚 **Vue-First & Nuxt-Ready** | Composition API, `<script setup>`, Vite-native. Built for Vue 3 from the ground up. |

---

## How It Works

1. **You register** your design system components (charts, tables, forms, cards) with a schema describing their props.
2. **The LLM receives** these schemas as tool definitions and decides which component to render, with which data.
3. **IntentUI validates** the incoming payload against the schema, resolves the component, and **mounts it progressively** during streaming — showing skeleton placeholders until complete.
4. **User interactions** inside rendered components (clicks, form submits, selections) are captured and sent back to the LLM as tool responses, continuing the agentic conversation.

```
┌────────────────────────────────────────────────────────┐
│                      User Input                        │
│        "Show me last month's sales data"               │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   LLM / Backend API                    │
│    Tool Call with Structured Output / JSON Schema      │
│    { "tool": "render_sales_chart", "props": { ... } }  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                IntentUI Core Engine                    │
│                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │ Component Registry    │  │ Partial JSON Parser   │  │
│  │ (Schema + Type-Safe)  │  │ (Stream Chunk Decoder)│  │
│  └───────────────────────┘  └───────────────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │ Event & Action Bridge │  │ Fallback / Skeletons  │  │
│  │ (Round-Trip Feedback) │  │ (Zero-CLS Transition) │  │
│  └───────────────────────┘  └───────────────────────┘  │
└───────────────────────────┬──────────────▲─────────────┘
                            │              │
                    Render  │              │ @action / @submit
                            ▼              │ (Feedback Loop)
┌──────────────────────────────────────────┴─────────────┐
│               Rendered Native Vue 3 UI                 │
│         <SalesChart :data="chartData" />               │
└────────────────────────────────────────────────────────┘
```

---

## Installation

```bash
# With pnpm (recommended)
pnpm add @intentui/vue

# With npm
npm install @intentui/vue

# With yarn
yarn add @intentui/vue
```

---

## Quick Start

**1. Register your components with schemas**

```typescript
// intent.config.ts
import { createIntentUI } from '@intentui/vue';
import { z } from 'zod';
import SalesChart from './components/SalesChart.vue';

export const intentUI = createIntentUI({
  components: {
    SalesChart: {
      component: SalesChart,
      description: 'Interactive sales chart with time filters',
      schema: z.object({
        title: z.string(),
        timeframe: z.enum(['daily', 'weekly', 'monthly']),
        metrics: z.array(z.object({ label: z.string(), value: z.number() })),
      }),
    },
  },
  fallback: () => import('./components/DefaultSkeleton.vue'),
});
```

**2. Render AI-generated components in your template**

```vue
<template>
  <IntentRenderer :stream="aiStream" @action="handleComponentAction">
    <template #loading="{ componentName }">
      <div class="skeleton">Loading {{ componentName }}...</div>
    </template>
  </IntentRenderer>
</template>

<script setup lang="ts">
import { useIntentChat } from '@intentui/vue';

const { aiStream, sendPrompt, handleComponentAction } = useIntentChat({
  api: '/api/generate-ui',
});
</script>
```

That's it. The LLM calls the tool, IntentUI renders the component. 🚀

---

## API Reference

### `createIntentUI(options)`

Creates and configures the IntentUI instance with your component registry.

```typescript
import { createIntentUI } from '@intentui/vue';
import { z } from 'zod';
import SalesChart from './components/SalesChart.vue';
import BookingCard from './components/BookingCard.vue';

export const intentUI = createIntentUI({
  components: {
    SalesChart: {
      component: SalesChart,
      description: 'Interactive sales chart with time range filters',
      schema: z.object({
        title: z.string(),
        timeframe: z.enum(['daily', 'weekly', 'monthly']),
        metrics: z.array(z.object({ label: z.string(), value: z.number() })),
      }),
    },
    BookingCard: {
      component: BookingCard,
      description: 'Interactive card for confirming or editing a booking',
      schema: z.object({
        bookingId: z.string(),
        hotelName: z.string(),
        dates: z.string(),
        price: z.number(),
      }),
    },
  },
  fallback: () => import('./components/DefaultSkeleton.vue'),
});

// Auto-generate tool definitions for your LLM backend
export const toolsDefinition = intentUI.getToolsDefinition();
```

---

### `<IntentRenderer>`

The core rendering component. Receives a stream, resolves components, and handles the full lifecycle.

```vue
<template>
  <IntentRenderer 
    :stream="aiStream" 
    @action="handleComponentAction"
  >
    <!-- Custom loading state with partial props -->
    <template #loading="{ componentName, partialProps }">
      <div class="skeleton-card">
        Streaming {{ componentName }}...
      </div>
    </template>

    <!-- Schema validation error fallback -->
    <template #error="{ error, rawPayload }">
      <div class="error-notice">Cannot render: {{ error.message }}</div>
    </template>
  </IntentRenderer>
</template>
```

| Prop / Event | Type | Description |
|---|---|---|
| `:stream` | `Ref<IntentStream>` | The reactive AI stream from `useIntentChat` |
| `@action` | `(event, payload) => void` | Emitted when the user interacts with a rendered component |
| `#loading` | Slot `{ componentName, partialProps }` | Custom skeleton during streaming |
| `#error` | Slot `{ error, rawPayload }` | Fallback when schema validation fails |

---

### `useIntentChat(options)`

Composable for managing the AI chat loop and generative UI streaming.

```typescript
const { aiStream, sendPrompt, handleComponentAction } = useIntentChat({
  api: '/api/generate-ui',
  onActionComplete: async (actionResult) => {
    // Action result is automatically sent back to the LLM
    console.log('User action completed:', actionResult);
  }
});
```

---

### `useIntentUI(options)`

Lower-level composable for canvas-style and custom intent-driven interfaces.

```typescript
const { 
  renderComponent, 
  isStreaming, 
  currentPayload, 
  emitAction 
} = useIntentUI({
  onAction: async (eventName, payload) => {
    await sendToolResponse({
      tool: currentPayload.value.name,
      event: eventName,
      data: payload,
    });
  }
});
```

---

## Comparison

| | **IntentUI** | Vercel AI SDK (RSC) | CopilotKit |
|---|---|---|---|
| **Framework** | Vue 3 / Nuxt | React / Next.js | React |
| **Rendering** | Pre-registered SFCs | Server Components | React Components |
| **Schema Validation** | Zod / Standard Schema | Zod | Zod |
| **Streaming** | Partial JSON + Skeletons | RSC Streaming | Streaming |
| **Security** | Allowlist only | Server-rendered | Allowlist |
| **Tool Calling** | Auto-generated from registry | Manual | Manual |
| **Agentic Loop** | Built-in round-trip | Manual | Built-in |

---

## Monorepo Structure

```
intentui/
├── packages/
│   ├── core/                  # Framework-agnostic parsing, streaming & schema engine
│   │   ├── src/
│   │   │   ├── parser.ts      # Partial JSON streaming parser & chunk decoder
│   │   │   ├── registry.ts    # Component registry, schema validation & tools generator
│   │   │   ├── bridge.ts      # Event & action bridge for agentic feedback loop
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── vue/                   # Vue 3 & Nuxt bindings
│   │   ├── src/
│   │   │   ├── IntentRenderer.vue  # Dynamic reactive rendering component
│   │   │   ├── useIntentChat.ts    # Composable for chat + Generative UI
│   │   │   ├── useIntentUI.ts      # Composable for canvas intent-driven UIs
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── nuxt/                  # Nuxt 3 module with auto-import & SSR streaming
│   │   └── src/module.ts
│   │
│   └── ui-kit/                # Optional prebuilt components (Charts, Tables, Cards)
│
├── playground/                # Interactive Vite demo (OpenAI, Gemini, Ollama examples)
├── docs/                      # VitePress documentation
├── package.json               # pnpm workspaces monorepo
└── README.md
```

---

## Roadmap

### Phase 1: Core Engine & Dynamic Renderer (MVP)
- [ ] Partial JSON streaming parser implementation
- [ ] Component registry with Zod / Standard Schema validation
- [ ] Auto tool/function calling definition generator (`getToolsDefinition()`)
- [ ] `<IntentRenderer>` with dynamic `component :is` and skeleton slots
- [ ] Bidirectional event handling (`@action` / `@submit` from generated components)

### Phase 2: Composable & Provider Integration
- [ ] `useIntentChat` composable with multi-provider support (OpenAI, Gemini, Anthropic, Ollama)
- [ ] Agentic round-trip loop (Tool Call → Render → User Action → Tool Response)
- [ ] **Model Context Protocol (MCP)** and advanced tool calling support
- [ ] History management and reactive component state persistence

### Phase 3: Developer Experience & Documentation
- [ ] Interactive playground with live examples (E-commerce, Analytics Dashboard, Form Wizard)
- [ ] Official VitePress documentation (`intentui.dev`)
- [ ] Full test suite with Vitest — 100% TypeScript

### Phase 4: Nuxt 3 Module & UI Kit
- [ ] `@intentui/nuxt` zero-config module with auto-import and server-side streaming (SSR/SSG)
- [ ] Optional headless or styled UI kit with dark-mode components

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to get started.

```bash
# Clone and install
git clone https://github.com/user/intentui.git
cd intentui
pnpm install

# Run the playground
pnpm dev

# Run tests
pnpm test
```

---

## License

[MIT](./LICENSE) © IntentUI Contributors
