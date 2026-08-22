# API Reference: `@intentui/vue`

Il pacchetto `@intentui/vue` fornisce i binding per **Vue 3**, componenti reattivi e composables per chat e canvas.

---

## Componenti

### `<IntentRenderer />`

Renderizza in modo reattivo lo stream di intenti ricevuti dall'AI.

#### Props
- `stream: Ref<IntentStreamChunk[]> | IntentStreamChunk[]`: Lo stream reattivo da visualizzare.

#### Slots
- `#default="{ component, props }"`: Customizzazione del rendering del componente risolto.
- `#loading="{ componentName, partialProps }"`: Visualizzazione di skeleton o loader durante lo streaming parziale dei dati.
- `#error="{ error, rawPayload }"`: Visualizzazione di errori se la validazione dello schema fallisce.

#### Events
- `@action`: Emesso quando un componente invia un'azione utente (es. click, selezione).

---

## Composables

### `useIntentChat(options: UseIntentChatOptions): UseIntentChatReturn`

Gestisce l'intero ciclo di vita della chat conversazionale e del loop agentico.

#### Parametri
```ts
interface UseIntentChatOptions {
  intentUI: IntentUIInstance;
  api?: string;                 // URL endpoint backend
  provider?: LLMProvider;       // Istanza diretta Provider (OpenAI, Gemini, ecc.)
  systemPrompt?: string;        // System prompt iniziale
  autoContinueOnAction?: boolean; // Continuare automaticamente la chat dopo un'azione (default: true)
  onActionComplete?: (action: IntentAction) => void | Promise<void>;
}
```

#### Valori Restituiti
```ts
interface UseIntentChatReturn {
  aiStream: Ref<IntentStreamChunk[]>;
  messages: Ref<ProviderMessage[]>;
  isStreaming: Ref<boolean>;
  error: Ref<Error | null>;
  sendPrompt: (message: string) => Promise<void>;
  handleComponentAction: (componentName: string, event: string, data: unknown) => Promise<void>;
  cancelStream: () => void;
  clearChat: () => void;
}
```

---

### `autoDiscoverComponents(modules, options?): Record<string, VueComponentDefinition>`

Scansiona i moduli restituiti da `import.meta.glob` ed estrae automaticamente i componenti Vue e gli schemi `defineIntent`.
