# Esempio: Dashboard Analytics & KPI

In questo esempio vedremo come configurare una dashboard analitica in cui l'utente può chiedere all'AI di mostrare indicatori KPI e grafici di vendita in tempo reale.

---

## 1. Registrazione dei Componenti

```ts
// src/intent.config.ts
import { createIntentUI, autoDiscoverComponents } from '@intentui/vue';
import { intentUIComponents } from '@intentui/ui-kit';

export const intentUI = createIntentUI({
  components: {
    // Include MetricCard e DataTable dalla UI Kit
    ...intentUIComponents,
    // Include SalesChart e DemographicChart locali
    ...autoDiscoverComponents(
      import.meta.glob('./components/*.vue', { eager: true })
    ),
  },
});
```

---

## 2. Prompt di Esempio per l'Utente

- *"Mostrami l'andamento del fatturato dell'ultimo trimestre"* $\rightarrow$ L'LLM invoca automaticamente `render_sales_chart`.
- *"Fammi un riassunto dei KPI principali e del tasso di crescita"* $\rightarrow$ L'LLM genera una `MetricCard` con trend positivo e percentuale.
- *"Elenca gli ultimi ordini con stato di consegna e importi"* $\rightarrow$ L'LLM genera una `DataTable` interattiva con filtri e ricerca.
