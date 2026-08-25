# API Reference: `@intentui-vue/core`

Il pacchetto `@intentui-vue/core` è il motore TypeScript puro di IntentUI. È indipendente da qualsiasi framework grafico.

---

## Funzioni Principali

### `createRegistry(options: RegistryOptions): Registry`
Crea un'istanza del registro dei componenti, valida i payload tramite Zod e genera le tool definitions JSON Schema per gli LLM.

```ts
import { createRegistry } from '@intentui-vue/core';
import { z } from 'zod';

const registry = createRegistry({
  components: {
    SalesChart: {
      component: MyComponent,
      description: 'Grafico vendite',
      schema: z.object({ title: z.string() }),
    },
  },
});
```

### `defineIntent(definition: IntentDefinition): IntentDefinition`
Helper per dichiarare schema e descrizione di un componente con inferenza dei tipi.

```ts
import { defineIntent } from '@intentui-vue/core';
import { z } from 'zod';

export const intent = defineIntent({
  description: 'Descrizione per l LLM',
  schema: z.object({ ... }),
});
```

### `createStreamParser(options: StreamParserOptions): StreamParser`
Parser tolerante per elaborare stream parziali di token JSON in tempo reale.

```ts
import { createStreamParser } from '@intentui-vue/core';

const parser = createStreamParser({
  onPartial: (partialObj) => console.log('Partial:', partialObj),
  onComplete: (finalObj) => console.log('Complete:', finalObj),
  onError: (err) => console.error(err),
});

parser.push('{ "title": "Ven');
parser.push('dite" }');
parser.end();
```

### `createActionBridge(options?: ActionBridgeOptions): ActionBridge`
Gestisce la cattura, lo storico e la trasmissione di eventi emessi dai componenti verso l'LLM.

---

## Providers

- `createOpenAIProvider(options: OpenAIOptions): LLMProvider`
- `createGeminiProvider(options: GeminiOptions): LLMProvider`
- `createAnthropicProvider(options: AnthropicOptions): LLMProvider`
- `createOllamaProvider(options: OllamaOptions): LLMProvider`
- `createProvider(options: CreateProviderConfig): LLMProvider`
