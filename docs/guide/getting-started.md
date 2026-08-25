# Getting Started

Benvenuto in **IntentUI**! In questa guida configureremo il tuo primo componente Vue generato dinamicamente dall'AI in meno di 5 minuti.

---

## 1. Installazione

Installa `@intentui-vue/vue` e `zod` nel tuo progetto Vue 3:

::: code-group
```bash [pnpm]
pnpm add @intentui-vue/vue zod
```

```bash [npm]
npm install @intentui-vue/vue zod
```

```bash [yarn]
yarn add @intentui-vue/vue zod
```
:::

*(Se usi Nuxt 3, puoi installare direttamente `@intentui-vue/nuxt`, vedi la [Guida a Nuxt](/guide/nuxt)).*

---

## 2. Crea il tuo primo Componente con `defineIntent`

Crea un file di componente, ad esempio `src/components/intent/SalesChart.vue`.

Con IntentUI, puoi dichiarare lo schema Zod e la descrizione del componente direttamente nello stesso file Vue:

```vue
<!-- src/components/intent/SalesChart.vue -->
<template>
  <div class="sales-chart">
    <h3>📊 {{ title }}</h3>
    <div v-for="m in metrics" :key="m.label" class="bar-row">
      <span>{{ m.label }}</span>
      <div class="bar" :style="{ width: m.value / 500 + '%' }">
        €{{ m.value.toLocaleString('it-IT') }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineIntent } from '@intentui-vue/vue';
import { z } from 'zod';

// L'intento e lo schema vivono insieme al componente!
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

---

## 3. Configura IntentUI con Auto-Discovery

Crea un file di configurazione, ad esempio `src/intent.config.ts`:

```ts
// src/intent.config.ts
import { createIntentUI, autoDiscoverComponents } from '@intentui-vue/vue';

export const intentUI = createIntentUI({
  // Scansiona automaticamente tutti i file .vue nella cartella!
  components: autoDiscoverComponents(
    import.meta.glob('./components/intent/*.vue', { eager: true })
  ),
});
```

---

## 4. Integra la Chat e `<IntentRenderer>`

Nel tuo componente principale (es. `App.vue`):

```vue
<template>
  <div class="chat-container">
    <div class="messages">
      <!-- Il renderer trasforma automaticamente lo stream nei tuoi componenti Vue -->
      <IntentRenderer :stream="aiStream">
        <template #loading="{ componentName }">
          <div class="skeleton">Caricamento {{ componentName }} in corso...</div>
        </template>
      </IntentRenderer>
    </div>

    <form @submit.prevent="sendMessage">
      <input v-model="inputPrompt" placeholder="Es. Mostra le vendite del Q1..." />
      <button :disabled="isStreaming">Invia 🚀</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IntentRenderer, useIntentChat, createOpenAIProvider } from '@intentui-vue/vue';
import { intentUI } from './intent.config';

const inputPrompt = ref('');

const { aiStream, isStreaming, sendPrompt } = useIntentChat({
  intentUI,
  provider: createOpenAIProvider({
    apiKey: 'sk-...', // In produzione usa un endpoint backend sicuro!
    model: 'gpt-4o',
  }),
});

async function sendMessage() {
  if (!inputPrompt.value.trim() || isStreaming.value) return;
  const prompt = inputPrompt.value;
  inputPrompt.value = '';
  await sendPrompt(prompt);
}
</script>
```

🎉 **Fatto!** L'AI capirà automaticamente quando generare il componente `<SalesChart>` restituendo dati validati in streaming in tempo reale.
