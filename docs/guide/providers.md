# Provider LLM

IntentUI include connettori universali per tutti i principali modelli e provider di intelligenza artificiale con supporto nativo per **Function Calling / Tool Calling** e **Streaming SSE**.

---

## 1. OpenAI

Supporta modelli come `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`.

```ts
import { createOpenAIProvider } from '@intentui/vue';

const provider = createOpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o', // default: 'gpt-4o'
  temperature: 0.7,
});
```

---

## 2. Google Gemini

Supporta modelli come `gemini-2.0-flash`, `gemini-1.5-pro`.

```ts
import { createGeminiProvider } from '@intentui/vue';

const provider = createGeminiProvider({
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.0-flash',
});
```

---

## 3. Anthropic Claude

Supporta modelli come `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`.

```ts
import { createAnthropicProvider } from '@intentui/vue';

const provider = createAnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
});
```

---

## 4. Ollama (Modelli Locali Gratuiti) 🦙

Supporta qualsiasi modello locale in esecuzione su Ollama compatibile con function calling (`llama3.1`, `mistral`, `qwen2.5`, `deepseek-r1`). **Zero costi e zero API key**.

```ts
import { createOllamaProvider } from '@intentui/vue';

const provider = createOllamaProvider({
  host: 'http://localhost:11434', // default
  model: 'llama3.1',
});
```

---

## 5. WebLLM (In-Browser WebGPU / Zero-Cloud) ⚡

Esegue modelli quantizzati (Llama 3.2 1B, Qwen 2.5 1.5B, Phi 3.5 mini) **completamente all'interno del browser** dell'utente tramite WebGPU. Zero costi API, zero latenza di rete e privacy totale.

```ts
import { createWebLLMProvider } from '@intentui/vue';

const provider = createWebLLMProvider({
  model: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  onProgress: (report) => {
    console.log(report.text, `${Math.round(report.progress * 100)}%`);
  },
});
```

---

## 6. Factory Generica `createProvider`

Se vuoi passare il provider in modo dinamico in base alla configurazione:

```ts
import { createProvider } from '@intentui/vue';

const provider = createProvider({
  type: 'webllm', // 'openai' | 'gemini' | 'anthropic' | 'ollama' | 'webllm'
  options: {
    model: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  },
});
```

