# IntentUI ⚡

> **The Intent-Driven Generative UI Toolkit for Vue 3 & Nuxt**  
> *Transform AI streams, JSON schemas, and user intentions into rich, native, interactive Vue components.*

[![npm version](https://img.shields.io/npm/v/@intentui/vue?color=0ea5e9&label=npm)](https://www.npmjs.com/package/@intentui/vue)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178c6.svg)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883.svg)](https://vuejs.org/)
[![Nuxt 3 Ready](https://img.shields.io/badge/Nuxt-3.x-00DC82.svg)](https://nuxt.com/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)](https://vitejs.dev/)

```
Tags: vue3 · generative-ui · nuxt · ai-sdk · llm-ui · function-calling · tool-calling · structured-outputs · zod · openai · gemini · claude · ollama · agentic-ui · zero-cls
```

---

## 🎯 The Goal of IntentUI

In today's AI landscape, most Large Language Model integrations are limited to a **"wall of text"** or static markdown. When an AI needs to show sales data, booking confirmations, or multi-step forms, writing plain text or raw markdown tables creates a poor user experience.

Meanwhile, the existing tooling for **Generative UI** (rendering dynamic, interactive components from AI) has been almost exclusively built around React and Next.js Server Components.

**IntentUI bridges this gap for the entire Vue 3 and Nuxt ecosystem.**

### The Core Philosophy: *Safe by Design, Native by Default*

1. **No Arbitrary Code Injection**: The LLM never writes raw HTML, CSS, or unsafe JavaScript. Instead, it selects and populates **your own pre-registered Vue Single File Components (SFCs)** from your design system.
2. **Schema-Validated & Type-Safe**: Every component is backed by a strict schema (Zod / Standard Schema). Props are validated before and during rendering.
3. **Progressive Streaming (Zero-CLS)**: As tokens stream from the LLM, IntentUI's *Partial JSON Parser* decodes incomplete data in real-time, displaying smooth shimmer skeletons and transitioning seamlessly into the final component without layout shifts.
4. **Bidirectional Agentic Loop**: User interactions (button clicks, form submits, selection changes) emit semantic events that automatically flow back to the LLM as tool results, enabling true multi-turn autonomous workflows.

---

## 💡 How It Works (The Mental Model)

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

1. **You define a catalog** of your existing Vue components with a Zod schema describing the expected props.
2. **IntentUI automatically converts** your catalog into standard LLM Tool / Function Calling definitions (`getToolsDefinition()`).
3. **The user asks a question** — the AI chooses the most appropriate component and streams back the structured payload.
4. **`<IntentRenderer>` mounts the component** progressively in your Vue application.
5. **The user interacts** with the rendered component, sending feedback back to the AI to continue the conversation.

---

## 🌟 Real-World Use Cases

| Scenario | What the AI Renders | Interactive Action |
|---|---|---|
| 📊 **Analytics & BI** | Interactive bar/line charts, KPI metric cards, filterable data tables | User clicks a metric bar → AI filters the view or explains anomalies |
| 🏨 **Booking & Travel** | Hotel cards, seat selection maps, date/time pickers | User clicks "Confirm" → AI generates confirmation and ticket PDF |
| 🛍️ **E-Commerce** | Product comparison cards, interactive carts, shipping forms | User selects a size/color → AI updates cart summary |
| 📝 **Multi-Step Wizards** | Dynamic step-by-step form wizards | User submits step 1 → AI validates and mounts step 2 |

---

## 🚀 Installation

```bash
# With pnpm (recommended)
pnpm add @intentui/vue @intentui/core zod

# With npm
npm install @intentui/vue @intentui/core zod

# With yarn
yarn add @intentui/vue @intentui/core zod
```

---

## ⚡ Quick Start

### 1. Register your components with schemas

```typescript
// intent.config.ts
import { createIntentUI } from '@intentui/vue';
import { z } from 'zod';
import SalesChart from './components/SalesChart.vue';
import BookingCard from './components/BookingCard.vue';

export const intentUI = createIntentUI({
  components: {
    SalesChart: {
      component: SalesChart,
      description: 'Displays an interactive sales chart with timeframe filters',
      schema: z.object({
        title: z.string().describe('Chart title'),
        timeframe: z.enum(['daily', 'weekly', 'monthly']),
        metrics: z.array(z.object({ label: z.string(), value: z.number() })),
      }),
    },
    BookingCard: {
      component: BookingCard,
      description: 'Card for hotel reservation details and confirmation',
      schema: z.object({
        bookingId: z.string(),
        hotelName: z.string(),
        price: z.number(),
      }),
    },
  },
});

// Pass this to your LLM API request (OpenAI, Gemini, Claude, Ollama)
export const toolsDefinition = intentUI.getToolsDefinition();
```

### 2. Render AI-generated components in your Vue template

```vue
<template>
  <div class="chat-container">
    <!-- Renders text, streaming skeletons, and interactive native components -->
    <IntentRenderer
      :stream="aiStream"
      :registry="intentUI.registry"
      :bridge="intentUI.bridge"
      @action="handleAction"
    >
      <!-- Optional: Custom loading skeleton -->
      <template #loading="{ componentName }">
        <div class="skeleton">Generating {{ componentName }}...</div>
      </template>

      <!-- Optional: Custom error fallback -->
      <template #error="{ error }">
        <div class="error-badge">Could not render: {{ error.message }}</div>
      </template>
    </IntentRenderer>
  </div>
</template>

<script setup lang="ts">
import { IntentRenderer, useIntentChat } from '@intentui/vue';
import { intentUI } from './intent.config';

const { aiStream, sendPrompt } = useIntentChat({
  api: '/api/generate-ui',
  intentUI,
});

function handleAction(componentName: string, event: string, data: unknown) {
  console.log(`User clicked ${event} on ${componentName}:`, data);
}
</script>
```

---

## 🤖 Supported AI Providers & Ecosystem

IntentUI is designed to work with any modern LLM supporting Tool Calling / Function Calling:

- 🟢 **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `o3-mini`
- 🔵 **Google Gemini**: `gemini-2.0-flash`, `gemini-1.5-pro`
- 🟣 **Anthropic Claude**: `claude-3-5-sonnet`, `claude-3-haiku`
- 🦙 **Ollama & Local LLMs**: `llama3`, `deepseek-r1`, `mistral`, `qwen`
- ⚡ **OpenAI-Compatible APIs**: Groq, Together AI, OpenRouter, Mistral API

---

## 📊 Comparison

| Feature | **IntentUI** | Vercel AI SDK (RSC) | CopilotKit |
|---|---|---|---|
| **Primary Framework** | **Vue 3 & Nuxt 3** | React / Next.js | React |
| **Component Architecture** | Native Vue SFCs | Server Components | React Components |
| **Type Safety & Schemas** | Zod / Standard Schema | Zod | Zod / JSON Schema |
| **Streaming Engine** | Partial JSON Streaming | RSC Streaming | SSE Chunk Streaming |
| **Tool Calling Export** | Automatic (`getToolsDefinition`) | Manual | Manual |
| **Round-Trip Agentic Loop** | Built-in Action Bridge | Manual State Handling | Built-in Copilot Context |
| **Runtime Dependencies** | Zero framework deps in core | React / Node specific | React specific |

---

## 📦 Monorepo Architecture

```
intentui/
├── packages/
│   ├── core/                  # Zero-dependency engine: streaming parser, registry, bridge
│   │   ├── src/
│   │   │   ├── parser.ts      # Tolerant streaming JSON decoder
│   │   │   ├── registry.ts    # Component catalog, schema validator, tool defs generator
│   │   │   ├── bridge.ts      # Action routing and agentic loop history
│   │   │   ├── providers/     # Lightweight HTTP/SSE adapters (OpenAI, Gemini, Anthropic, Ollama)
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── vue/                   # Vue 3 & Nuxt native bindings
│   │   ├── src/
│   │   │   ├── IntentRenderer.ts   # Dynamic reactive component renderer
│   │   │   ├── useIntentChat.ts    # Chat lifecycle & generative streaming composable
│   │   │   ├── useIntentUI.ts      # Canvas / custom dashboard composable
│   │   │   ├── plugin.ts           # createIntentUI() factory
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── nuxt/                  # Nuxt 3 module with auto-import & SSR streaming
│   └── ui-kit/                # Pre-built headless and styled components
│
├── playground/                # Interactive Vite demo with mock & live providers
├── DEVELOPMENT_PLAN.md        # Technical architecture & implementation plan
├── package.json               # pnpm workspaces root
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please check out [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for architecture guidelines.

```bash
# Clone the repository
git clone https://github.com/SalvatoreCervone/intentui.git
cd intentui

# Install dependencies
pnpm install

# Run all tests
pnpm test

# Launch the interactive playground
pnpm dev
```

---

## 📄 License

[MIT](./LICENSE) © IntentUI Contributors
