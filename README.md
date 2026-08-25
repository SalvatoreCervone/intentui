# IntentUI ⚡

> **The Intent-Driven Generative UI Toolkit for Vue 3 & Nuxt**  
> *Transform AI streams, JSON schemas, and user intentions into rich, native, interactive Vue components.*

[![npm version](https://img.shields.io/npm/v/@intentui-vue/vue?color=6366f1&label=npm)](https://www.npmjs.com/package/@intentui-vue/vue)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178c6.svg)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883.svg)](https://vuejs.org/)
[![Nuxt 3](https://img.shields.io/badge/Nuxt-3.x-00DC82.svg)](https://nuxt.com/)
[![Tests](https://img.shields.io/badge/Tests-77%2F77%20Passing-success)](https://vitest.dev/)


```
Tags: vue3 · generative-ui · nuxt · ai-sdk · llm-ui · function-calling · tool-calling · structured-outputs · zod · openai · gemini · claude · ollama · agentic-ui · zero-cls · bidirectional-loop · state-diffing
```

---

## 🎯 The Goal of IntentUI

In today's AI landscape, most LLM integrations are limited to a **"wall of text"** or static markdown. When an AI needs to present sales analytics, booking reservations, or multi-step checkout forms, writing plain text creates a poor user experience.

Existing tooling for **Generative UI** has been almost exclusively built around React and Next.js Server Components.

**IntentUI bridges this gap for the entire Vue 3 and Nuxt ecosystem.**

### Core Philosophy: *Safe by Design, Native by Default, Bidirectional by Nature*

1. **No Arbitrary Code Injection**: The LLM never writes raw HTML, CSS, or unsafe JavaScript. Instead, it selects and populates **your own pre-registered Vue Single File Components (SFCs)**.
2. **Schema-Validated & Type-Safe**: Every component is backed by a strict **Zod** schema. Props are validated before and during rendering.
3. **Progressive Streaming (Zero-CLS)**: As tokens stream from the LLM, IntentUI's *Partial JSON Parser* decodes incomplete data in real-time, displaying smooth skeletons and transitioning seamlessly into the final component.
4. **Bidirectional State & Hot-Patching**: User interactions (filtering, adjusting sliders, form steps) emit fine-grained state diffs that instantly patch visible components in-place with zero flicker, while keeping the AI context continuously synchronized.
5. **Zero-Boilerplate Auto-Discovery**: Components declare their intent inline with `defineIntent()` and are discovered with a single `autoDiscoverComponents()` call.


---

## 💡 How It Works (Mental Model)

```
┌────────────────────────────────────────────────────────┐
│                      User Prompt                       │
│        "Show me last month's sales breakdown"          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   LLM / Backend API                    │
│      AI executes Tool Call with Structured Data        │
│   { "tool": "render_sales_chart", "props": { ... } }   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                IntentUI Core Engine                    │
│                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │ Component Registry    │  │ Partial JSON Parser   │  │
│  │ (Zod Schema Validate) │  │ (Real-Time Streaming) │  │
│  └───────────────────────┘  └───────────────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │ Event & Action Bridge │  │ Skeletons & Fallbacks │  │
│  │ (Agentic Round-Trip)  │  │ (Zero Layout Shift)   │  │
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

## 📦 Packages in this Monorepo

| Package | Version | Description |
|---|---|---|
| [`@intentui-vue/core`](./packages/core) | `1.0.0` | Zero-dependency core engine: tolerant partial streaming JSON parser, Zod registry, action bridge, and unified LLM providers (**OpenAI, Gemini, Anthropic, Ollama**). |
| [`@intentui-vue/vue`](./packages/vue) | `1.0.0` | Native Vue 3 bindings: `<IntentRenderer>`, `useIntentChat` (agentic loop), `useIntentUI` (canvas), `defineIntent()`, and `autoDiscoverComponents()`. |
| [`@intentui-vue/nuxt`](./packages/nuxt) | `1.0.0` | Official Nuxt 3 module with zero-config auto-imports and secure Nitro server streaming handler (`/api/intent-chat`). |
| [`@intentui-vue/ui-kit`](./packages/ui-kit) | `1.0.0` | Headless & styled Generative UI components: `MetricCard`, `DataTable`, `FormWizard`, and `ConfirmationCard`. |

---

## 🚀 Quick Start in 5 Minutes

### 1. Install dependencies

```bash
# For Vue 3 (Vite, Webpack, etc.)
pnpm add @intentui-vue/vue zod

# For Nuxt 3
pnpm add @intentui-vue/nuxt @intentui-vue/vue zod
```

### 2. Create your component with `defineIntent`

```vue
<!-- src/components/intent/SalesChart.vue -->
<template>
  <div class="sales-chart">
    <h3>📊 {{ title }}</h3>
    <div v-for="m in metrics" :key="m.label" class="bar-row">
      <span>{{ m.label }}</span>
      <div class="bar" :style="{ width: (m.value / 500) + '%' }">
        €{{ m.value.toLocaleString('it-IT') }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineIntent } from '@intentui-vue/vue';
import { z } from 'zod';

export const intent = defineIntent({
  description: 'Mostra il grafico delle vendite e del fatturato commerciale',
  schema: z.object({
    title: z.string().describe('Titolo del grafico di vendita'),
    metrics: z.array(
      z.object({
        label: z.string().describe('Mese o periodo'),
        value: z.number().describe('Importo vendite in euro'),
      })
    ).describe('Dati di vendita'),
  }),
});
</script>

<script setup lang="ts">
defineProps<{
  title: string;
  metrics: { label: string; value: number }[];
}>();
</script>
```

### 3. Configure with Zero-Boilerplate Auto-Discovery

```ts
// src/intent.config.ts
import { createIntentUI, autoDiscoverComponents } from '@intentui-vue/vue';
import { intentUIComponents } from '@intentui-vue/ui-kit';

export const intentUI = createIntentUI({
  components: {
    // 1. Ready-made UI Kit components (MetricCard, DataTable, FormWizard, ConfirmationCard)
    ...intentUIComponents,
    // 2. Auto-scanned local components
    ...autoDiscoverComponents(
      import.meta.glob('./components/intent/*.vue', { eager: true })
    ),
  },
});
```

### 4. Render in your Vue Chat or Canvas

```vue
<!-- src/App.vue -->
<template>
  <div class="chat-app">
    <div class="messages">
      <IntentRenderer :stream="aiStream">
        <template #loading="{ componentName }">
          <div class="skeleton">Caricamento {{ componentName }} in corso...</div>
        </template>
      </IntentRenderer>
    </div>

    <form @submit.prevent="handleSend">
      <input v-model="prompt" placeholder="Chiedi qualcosa all'AI..." />
      <button :disabled="isStreaming">Invia 🚀</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IntentRenderer, useIntentChat, createOpenAIProvider } from '@intentui-vue/vue';
import { intentUI } from './intent.config';

const prompt = ref('');

const { aiStream, isStreaming, sendPrompt } = useIntentChat({
  intentUI,
  provider: createOpenAIProvider({
    apiKey: 'sk-...', // In produzione usa un endpoint backend sicuro!
    model: 'gpt-4o',
  }),
});

async function handleSend() {
  if (!prompt.value.trim() || isStreaming.value) return;
  const text = prompt.value;
  prompt.value = '';
  await sendPrompt(text);
}
</script>
```

### 5. Bidirectional State Diffing & Hot Prop Patching (Zero-Flicker)

```ts
const { handleStateChange, patchLastIntentProps } = useIntentChat({
  intentUI,
  onStateDiffComplete: (diff) => {
    console.log('Props patched in real-time:', diff);
  }
});

// 1. Hot patch visible component props instantly without unmounting
patchLastIntentProps({ timeframe: 'monthly' });

// 2. Or propagate user mutations back to both UI and the AI agent
await handleStateChange('SalesChart', { timeframe: 'monthly' }, { timeframe: 'daily' }, /* continueThread */ true);
```

---


## 🤖 Supported AI Providers

- 🟢 **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `o3-mini`
- 🔵 **Google Gemini**: `gemini-2.0-flash`, `gemini-1.5-pro`
- 🟣 **Anthropic Claude**: `claude-3-5-sonnet`, `claude-3-5-haiku`
- 🦙 **Ollama (Free & Local)**: `llama3.1`, `mistral`, `qwen2.5`, `deepseek-r1`
- ⚡ **WebLLM (In-Browser WebGPU)**: `Llama-3.2-1B`, `Qwen2.5-1.5B`, `Phi-3.5-mini` (Zero network latency, 100% offline & client-side)

---

## 🧩 Pre-Built UI Kit (`@intentui-vue/ui-kit`)

| Component | Description | Interactive Action |
|---|---|---|
| **`MetricCard`** | KPI card with percentage growth badges, trends, and timeframe labels | `@action('click')` |
| **`DataTable`** | Filterable table with full-text search, column sorting, status badges, and pagination | `@action('row_click')` |
| **`FormWizard`** | Dynamic form generated by AI (text, number, select, textarea, checkbox) | `@submit(formData)` |
| **`ConfirmationCard`** | Transactional approval card with severity levels (`info`, `warning`, `danger`) | `@submit({ confirmed })` |
| **`ActionStagingCard`** | Visual guardrail & parameter staging area with diff comparison and inline editing | `@submit({ confirmed, parameters })`, `@stateChange(diff)` |

---


## 📖 Documentation Site

Official documentation site powered by VitePress is available in the `docs/` folder:

```bash
# Launch documentation in development mode
pnpm docs:dev

# Build static production documentation
pnpm docs:build
```

---

## 🛠️ Development & Testing

```bash
# Install dependencies
pnpm install

# Run the full Vitest suite (12 suites, 68 tests)
pnpm test

# Build all packages (@intentui-vue/core, @intentui-vue/vue, @intentui-vue/nuxt, @intentui-vue/ui-kit)
pnpm build

# Launch the interactive playground
pnpm dev
```

---

## 📄 License

[MIT](./LICENSE) © 2026 IntentUI Contributors
