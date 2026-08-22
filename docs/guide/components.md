# Creazione Componenti & Schemi

In IntentUI, ogni componente generabile dall'AI viene descritto da due elementi fondamentali:
1. **La Descrizione**: spiega all'LLM in quali contesti deve decidere di mostrare questo componente.
2. **Lo Schema Zod**: definisce i tipi, le proprietà e i vincoli delle props che il componente accetta.

---

## Utilizzo di `defineIntent`

Il modo più rapido e moderno per dichiarare un intento è usare l'helper `defineIntent`:

```vue
<!-- components/intent/UserCard.vue -->
<template>
  <div class="user-card">
    <img :src="avatar" class="avatar" />
    <div class="info">
      <h4>{{ name }}</h4>
      <span class="role">{{ role }}</span>
      <span class="status" :class="status">{{ status }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineIntent } from '@intentui/vue';
import { z } from 'zod';

export const intent = defineIntent({
  // 1. Descrizione in linguaggio naturale per l'LLM
  description: 'Mostra il profilo utente con avatar, ruolo aziendale e stato di presenza',
  // 2. Schema Zod con descrizioni delle singole proprietà
  schema: z.object({
    name: z.string().describe('Nome e cognome dell utente'),
    role: z.string().describe('Ruolo o mansione lavorativa'),
    avatar: z.string().url().describe('URL dell immagine profilo avatar'),
    status: z.enum(['online', 'offline', 'busy']).describe('Stato di disponibilità'),
  }),
});
</script>

<script setup lang="ts">
defineProps<{
  name: string;
  role: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
}>();
</script>
```

---

## Best Practice per le Descrizioni

Le descrizioni aiutano il modello di intelligenza artificiale a distinguere quando usare un componente rispetto a un altro.

| ❌ Da Evitare | ✅ Consigliato |
|---|---|
| *"Componente tabella per cose"* | *"Tabella per visualizzare ordini e transazioni con importi in EUR e stato di pagamento"* |
| *"Grafico generico"* | *"Grafico a barre temporale specifico per fatturato e vendite commerciali"* |

::: tip CONSIGLIO SULLE DESCRIZIONI DEI CAMPI
Usa `.describe('...')` su ogni proprietà Zod. L'LLM utilizzerà queste descrizioni per generare valori pertinenti e formattati correttamente.
:::

---

## File Schema Separati (`.schema.ts`)

Se preferisci non inserire lo schema Zod nel file `.vue`, puoi creare un file affiancato con estensione `.schema.ts`:

```
components/intent/
├── UserCard.vue
└── UserCard.schema.ts
```

Nel file `UserCard.schema.ts`:
```ts
import { defineIntent } from '@intentui/vue';
import { z } from 'zod';

export const intent = defineIntent({
  description: 'Profilo utente',
  schema: z.object({
    name: z.string(),
    role: z.string(),
  }),
});
```

`autoDiscoverComponents()` unirà automaticamente il file `.vue` con il rispettivo `.schema.ts`!
