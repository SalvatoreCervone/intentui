# Architettura & Sicurezza

Comprendere come funziona **IntentUI** sotto il cofano ti permette di sfruttarne appieno le potenzialità mantenendo l'applicazione performante e sicura.

---

## 1. Come Funziona il Flusso Generativo

```
[ Utente invia prompt ]
         │
         ▼
[ LLM elabora & decide di invocare un Tool ]
         │ (Stream SSE di token JSON)
         ▼
[ @intentui-vue/core Parser ] ───► Parsing Parziale Tollerante (partial-json)
         │
         ▼
[ @intentui-vue/vue IntentRenderer ] ───► Mostra Skeleton (#loading) in tempo reale
         │
         ▼ (Stream Completato)
[ Validazione Zod Strict ] ───► Renderizza Componente Vue Reattivo
         │
         ▼ (Utente interagisce, es. clicca "Conferma")
[ Action Bridge ] ───► Invia @action / @submit all'LLM (Loop Agentico)
```

---

## 2. Partial JSON Streaming & Skeleton States

Quando un LLM risponde con un Function Call o un JSON, genera i token uno per uno:
```json
{ "title": "Ven
{ "title": "Vendite Q1", "met
{ "title": "Vendite Q1", "metrics": [{ "label": "Gen
```

I parser JSON tradizionali come `JSON.parse()` vanno in crash su stringhe incomplete. 

**IntentUI Core** utilizza un parser incrementale che:
1. Ad ogni nuovo chunk di testo, tenta di estrarre un oggetto JavaScript valido parziale.
2. Invia l'oggetto al componente `<IntentRenderer>`.
3. Permette di mostrare animazioni e skeleton parziali (`<template #loading>`) durante il caricamento.
4. Quando lo stream si chiude (`[DONE]`), esegue una validazione rigorosa con lo schema **Zod** prima di montare definitivamente il componente.

---

## 3. Sicurezza delle API Key: Client vs Server

::: danger ATTENZIONE ALLE API KEY NEL BROWSER
In ambiente di produzione, **non inserire mai le API Key dei provider LLM (OpenAI, Anthropic, Gemini) nel codice frontend/client**. Chiunque apra il browser potrebbe estrarre la tua chiave e consumare i tuoi crediti.
:::

IntentUI supporta due pattern architetturali per la sicurezza:

### A. Pattern con Backend Proxy (Consigliato per SPA Vue 3)
Il frontend contatta il tuo server backend (Express, Fastify, Nest, Python FastAPI, Cloudflare Workers), che custodisce l'API key nel file `.env`:

```ts
// Nel frontend Vue 3
const { aiStream, sendPrompt } = useIntentChat({
  intentUI,
  api: '/api/chat', // Il tuo backend sicuro
});
```

Nel tuo backend Node.js:
```ts
import { createOpenAIProvider } from '@intentui-vue/core';

// Legge la chiave da process.env sul server
const provider = createOpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});
```

### B. Pattern con Modulo Nuxt 3 (`@intentui-vue/nuxt`)
Se usi Nuxt 3, il modulo gestisce tutto automaticamente:
1. Nel file `.env`: `NUXT_INTENTUI_API_KEY=sk-...`
2. Il modulo crea automaticamente l'endpoint server Nitro `/api/intent-chat`.
3. Il frontend riceve lo stream senza configurare alcun codice server manuale.

### C. Modelli Locali (Ollama)
Se utilizzi modelli locali come **Ollama** su `http://localhost:11434` o su una rete interna privata, non è richiesta alcuna API key ed è possibile comunicare direttamente anche in locale.

---

## 4. Il Loop Agentico Round-Trip

I componenti generati da IntentUI non sono immagini o HTML statico, ma veri componenti Vue interattivi con pulsanti, form e grafici cliccabili.

Quando un componente emette un evento:
```vue
<!-- Dentro il tuo componente -->
<button @click="$emit('submit', { bookingId: '123', confirmed: true })">
  Conferma
</button>
```

`useIntentChat` cattura l'evento, formatta un messaggio di tipo `tool` per l'LLM e avvia automaticamente la continuazione della conversazione, creando un'esperienza agentica conversazionale bidirezionale.

---

## 5. Bidirectional State Diffing & Hot Prop Patching ⚡

Per evitare il costoso smontaggio e rimontaggio dei componenti (che causa sfarfallio e perdita del focus utente), IntentUI supporta il **fine-grained prop patching**:

```ts
const { patchLastIntentProps, handleStateChange } = useIntentChat({ intentUI, provider });

// 1. Aggiorna istantaneamente le props visibili del componente montato
patchLastIntentProps({ timeframe: 'monthly', currency: 'EUR' });

// 2. Oppure propaga la modifica utente all'agente calcolando il delta preciso
await handleStateChange(
  'SalesChart',
  { timeframe: 'monthly' }, // Nuovo stato
  { timeframe: 'daily' },   // Stato precedente
  true                      // Invia notifica all'agente per proseguire la conversazione
);
```

---

## 6. Human-in-the-Loop & Visual Guardrails 🛡️

Per garantire la massima sicurezza su azioni distruttive o critiche (es. modifiche database, trasferimenti fondi), il kit include `<ActionStagingCard>`:
* **Visual Diff Before/After**: confronta i valori correnti con quelli proposti.
* **Inline Parameter Editing**: permette all'umano di ritoccare i parametri direttamente nella card prima del commit.
* **Explicit Safety Agreement**: sblocca il pulsante di conferma solo dopo approvazione esplicita.

