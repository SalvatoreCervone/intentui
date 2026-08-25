# Modulo Nuxt 3 (`@intentui-vue/nuxt`)

Il modulo ufficiale `@intentui-vue/nuxt` fornisce un'integrazione a configurazione zero per applicazioni **Nuxt 3** con SSR e sicurezza backend integrata.

---

## 1. Installazione

Installa `@intentui-vue/nuxt`, `@intentui-vue/vue` e `zod`:

```bash
pnpm add @intentui-vue/nuxt @intentui-vue/vue zod
```

---

## 2. Abilitazione in `nuxt.config.ts`

Aggiungi il modulo nel tuo file di configurazione Nuxt:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@intentui-vue/nuxt'
  ],
  intentui: {
    // Provider predefinito per il server proxy
    provider: 'openai',
    model: 'gpt-4o',
    // Endpoint backend (default: '/api/intent-chat')
    serverRoute: '/api/intent-chat',
  }
});
```

---

## 3. Configura le Chiavi nel file `.env`

Nel file `.env` alla radice del tuo progetto Nuxt:

```bash
# Il modulo Nuxt legge automaticamente queste variabili sul server!
OPENAI_API_KEY=sk-proj-...
# oppure GEMINI_API_KEY=...
# oppure ANTHROPIC_API_KEY=...
```

---

## 4. Utilizzo nei Componenti Nuxt (Zero-Import)

Grazie all'auto-import di Nuxt, sia `<IntentRenderer>` che `useIntentChat` sono disponibili ovunque senza `import` espliciti:

```vue
<!-- pages/index.vue -->
<template>
  <div class="container">
    <IntentRenderer :stream="aiStream" />

    <form @submit.prevent="sendPrompt(userInput)">
      <input v-model="userInput" placeholder="Chiedi qualcosa..." />
      <button :disabled="isStreaming">Invia</button>
    </form>
  </div>
</template>

<script setup lang="ts">
const userInput = ref('');

// useIntentChat contatta automaticamente l'endpoint protetto /api/intent-chat
const { aiStream, isStreaming, sendPrompt } = useIntentChat({
  api: '/api/intent-chat',
});
</script>
```

---

## Vantaggi del Modulo Nuxt 3

1. **Sicurezza Totale**: Nessuna API key viaggia nel browser dell'utente.
2. **Auto-Import Completo**: `<IntentRenderer>`, `useIntentChat`, `useIntentUI`, `defineIntent` disponibili ovunque.
3. **SSR & Nitro Streaming**: Streaming compatibile con Node.js, Vercel, Netlify, Cloudflare e server standalone.
