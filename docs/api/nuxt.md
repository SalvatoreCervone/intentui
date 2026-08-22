# API Reference: `@intentui/nuxt`

Il modulo ufficiale Nuxt 3 per IntentUI.

---

## Configurazione Modulo (`nuxt.config.ts`)

```ts
export default defineNuxtConfig({
  modules: ['@intentui/nuxt'],
  intentui: {
    /** Percorso della cartella componenti intent (default: 'components/intent') */
    componentsDir: 'components/intent',
    /** Endpoint server per streaming Nitro (default: '/api/intent-chat') */
    serverRoute: '/api/intent-chat',
    /** Provider predefinito per il server ('openai' | 'gemini' | 'anthropic' | 'ollama') */
    provider: 'openai',
    /** Modello predefinito */
    model: 'gpt-4o',
    /** Prefisso per i componenti auto-importati (es. 'Intent' -> '<IntentSalesChart>') */
    prefix: '',
  },
});
```

---

## Variabili d'Ambiente Server (.env)

Il server handler Nitro legge automaticamente:
- `OPENAI_API_KEY` o `INTENTUI_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OLLAMA_HOST` (default: `http://localhost:11434`)
- `NUXT_INTENTUI_PROVIDER`
- `NUXT_INTENTUI_MODEL`
