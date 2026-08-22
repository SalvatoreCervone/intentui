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

## 5. Factory Generica `createProvider`

Se vuoi passare il provider in modo dinamico in base alla configurazione:

```ts
import { createProvider } from '@intentui/vue';

const provider = createProvider({
  type: 'openai', // 'openai' | 'gemini' | 'anthropic' | 'ollama'
  apiKey: '...',
  model: 'gpt-4o-mini',
});
```
