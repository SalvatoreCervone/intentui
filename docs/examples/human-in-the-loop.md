# Esempio: Approvazioni Human-in-the-Loop

Quando l'AI esegue azioni con impatto reale (es. pagamenti, modifiche a database, cancellazione di risorse), è fondamentale chiedere conferma esplicita all'utente prima di procedere.

---

## 1. Il Flusso

```
1. Utente: "Cancella il cluster di produzione prod-eu-1"
2. AI: Invia un tool call per renderizzare <ConfirmationCard severity="danger">
3. Frontend: Mostra all'utente la card con i dettagli e il pulsante "Conferma ed Esegui"
4. Utente: Clicca "Conferma ed Esegui"
5. Action Bridge: Invia all'AI { confirmed: true, severity: 'danger' }
6. AI: Esegue l'operazione e risponde: "Cluster prod-eu-1 eliminato con successo."
```

---

## 2. Codice

Grazie a `ConfirmationCard` in `@intentui-vue/ui-kit`, l'LLM ha già lo schema per generare la richiesta di conferma:

```vue
<!-- App.vue -->
<template>
  <IntentRenderer :stream="aiStream" />
</template>

<script setup lang="ts">
import { useIntentChat, IntentRenderer } from '@intentui-vue/vue';
import { intentUI } from './intent.config';

const { aiStream, sendPrompt } = useIntentChat({
  intentUI,
  autoContinueOnAction: true, // Continua automaticamente la chat quando l utente clicca Conferma!
  onActionComplete: (action) => {
    console.log('Azione utente completata:', action);
  },
});
</script>
```
