# Auto-Discovery (Zero-Boilerplate)

Per evitare di dover importare e mappare manualmente decine di componenti in un file centrale di configurazione, IntentUI include una funzione di **Auto-Discovery** basata su `import.meta.glob`.

---

## Come Funziona

Basta posizionare tutti i componenti generabili dall'AI in una cartella dedicata (es. `src/components/intent/`) ed esportare l'intento con `defineIntent()`.

Nella configurazione di IntentUI:

```ts
// src/intent.config.ts
import { createIntentUI, autoDiscoverComponents } from '@intentui/vue';

export const intentUI = createIntentUI({
  components: autoDiscoverComponents(
    import.meta.glob('./components/intent/*.vue', { eager: true })
  ),
});
```

`autoDiscoverComponents` esegue automaticamente le seguenti operazioni:
1. Scansiona tutti i file `.vue` e `.schema.ts` restituiti dal glob.
2. Estrae il nome del componente dal nome del file (es. `SalesChart.vue` $\rightarrow$ `SalesChart`).
3. Estrae il componente Vue e lo schema/descrizione definiti tramite `defineIntent()`.
4. Restituisce il dizionario pronto per `createIntentUI`.

---

## Opzioni di Personalizzazione

Puoi passare un secondo argomento con opzioni personalizzate:

```ts
export const intentUI = createIntentUI({
  components: autoDiscoverComponents(
    import.meta.glob('./components/intent/*.vue', { eager: true }),
    {
      // Trasforma o aggiunge un prefisso ai nomi dei componenti
      nameTransform: (filePath, baseName) => `App${baseName}`,
      
      // Se impostato a false, include anche componenti senza schema (con fallback)
      requireIntent: true,
    }
  ),
});
```

---

## Unire Componenti della UI Kit

Se vuoi usare sia i tuoi componenti personalizzati che quelli pronti all'uso di `@intentui/ui-kit`:

```ts
import { createIntentUI, autoDiscoverComponents } from '@intentui/vue';
import { intentUIComponents } from '@intentui/ui-kit';

export const intentUI = createIntentUI({
  components: {
    // 1. Componenti del pacchetto UI Kit ufficiale
    ...intentUIComponents,
    // 2. I tuoi componenti locali scansionati automaticamente
    ...autoDiscoverComponents(
      import.meta.glob('./components/intent/*.vue', { eager: true })
    ),
  },
});
```
