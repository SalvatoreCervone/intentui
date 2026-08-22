# API Reference: `@intentui/ui-kit`

Il pacchetto `@intentui/ui-kit` fornisce componenti Generative UI pronti all'uso, accessibili e stilizzati con cura.

---

## Componenti Inclusi

### 1. `MetricCard`
Card per statistiche sintetiche, indicatori KPI e percentuali di crescita.
- **Props**: `title`, `value`, `unit`, `change`, `trend` (`up` | `down` | `neutral`), `timeframe`, `description`.
- **Eventi**: `@action('click', ...)`

### 2. `DataTable`
Tabella dati interattiva con ricerca, ordinamento per colonna, badge di stato e paginazione.
- **Props**: `title`, `columns: { key, label, type? }[]`, `rows: Record<string, any>[]`, `searchable?: boolean`, `pageSize?: number`.
- **Eventi**: `@action('row_click', row)`

### 3. `FormWizard`
Form dinamico generato dall'AI per raccogliere input dall'utente (testo, numeri, select, textarea, checkbox).
- **Props**: `title`, `description`, `fields: { name, label, type, placeholder, options, required, defaultValue }[]`, `submitLabel`.
- **Eventi**: `@submit(formData)`

### 4. `ConfirmationCard`
Card di approvazione Human-in-the-Loop per operazioni critiche o transazionali.
- **Props**: `title`, `message`, `severity?: 'info'|'warning'|'danger'`, `details?: { label, value }[]`, `confirmLabel`, `cancelLabel`.
- **Eventi**: `@submit({ confirmed: true })`, `@action('cancel', { confirmed: false })`

---

## Import Rapido nel Registry

```ts
import { createIntentUI } from '@intentui/vue';
import { intentUIComponents } from '@intentui/ui-kit';

export const intentUI = createIntentUI({
  // Registra automaticamente tutti i 4 componenti del kit!
  components: intentUIComponents,
});
```
