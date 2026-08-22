import type { IntentStreamChunk } from '@intentui/core';

/**
 * Simulated LLM streaming responses for local development.
 * Sends JSON characters one-by-one with a configurable delay,
 * emulating real LLM token-by-token streaming.
 */

interface MockScenario {
  name: string;
  description: string;
  payload: Record<string, unknown>;
}

const scenarios: Record<string, MockScenario> = {
  salesChart: {
    name: 'Sales Chart',
    description: 'Monthly sales data',
    payload: {
      component: 'SalesChart',
      props: {
        title: 'Q1 2026 Revenue',
        timeframe: 'monthly',
        metrics: [
          { label: 'Gennaio', value: 45200 },
          { label: 'Febbraio', value: 52800 },
          { label: 'Marzo', value: 61400 },
        ],
      },
    },
  },
  metricCard: {
    name: 'KPI Metric Card',
    description: 'Statistiche e indicatori di crescita',
    payload: {
      component: 'MetricCard',
      props: {
        title: 'Fatturato Ricorrente (MRR)',
        value: 78500,
        unit: '€',
        change: 18.4,
        trend: 'up',
        timeframe: 'vs mese scorso',
        description: 'Crescita trainata dai nuovi abbonamenti Enterprise',
      },
    },
  },
  dataTable: {
    name: 'Interactive Data Table',
    description: 'Tabella ordinabile con ricerca e filtri',
    payload: {
      component: 'DataTable',
      props: {
        title: 'Transazioni Recenti',
        pageSize: 4,
        searchable: true,
        columns: [
          { key: 'customer', label: 'Cliente' },
          { key: 'plan', label: 'Piano' },
          { key: 'amount', label: 'Importo', type: 'currency' },
          { key: 'status', label: 'Stato', type: 'badge' },
        ],
        rows: [
          { customer: 'Acme Corp', plan: 'Enterprise', amount: 4800, status: 'Pagato' },
          { customer: 'TechStart Ltd', plan: 'Pro', amount: 1200, status: 'In attesa' },
          { customer: 'Studio Rossi', plan: 'Starter', amount: 290, status: 'Pagato' },
          { customer: 'Global Logix', plan: 'Enterprise', amount: 7500, status: 'Pagato' },
          { customer: 'Apex Digital', plan: 'Pro', amount: 1200, status: 'Annullato' },
        ],
      },
    },
  },
  formWizard: {
    name: 'Dynamic Form Wizard',
    description: 'Form generato dall AI per input utente',
    payload: {
      component: 'FormWizard',
      props: {
        title: 'Crea Nuovo Cluster Cloud',
        description: 'Compila i dettagli per avviare il deployment',
        submitLabel: 'Avvia Provisioning ⚡',
        fields: [
          { name: 'clusterName', label: 'Nome Cluster', type: 'text', placeholder: 'es. prod-eu-west-1', required: true },
          { name: 'region', label: 'Regione Cloud', type: 'select', options: ['eu-central-1 (Frankfurt)', 'eu-west-1 (Ireland)', 'us-east-1 (N. Virginia)'], required: true },
          { name: 'nodes', label: 'Numero di Nodi', type: 'number', defaultValue: 3 },
          { name: 'enableAutoscaling', label: 'Opzioni Avanzate', type: 'checkbox', placeholder: 'Abilita Autoscaling dinamico' },
        ],
      },
    },
  },
  confirmationCard: {
    name: 'Action Confirmation',
    description: 'Approvazione Human-in-the-Loop',
    payload: {
      component: 'ConfirmationCard',
      props: {
        title: 'Autorizza Rimborso Transazione',
        message: 'L azione accrediterà immediatamente i fondi al cliente e annullerà l abbonamento.',
        severity: 'danger',
        details: [
          { label: 'ID Transazione', value: 'tx_99382109' },
          { label: 'Importo Rimborso', value: '€ 1.250,00' },
          { label: 'Metodo', value: 'Carta di Credito (Stripe)' },
        ],
        confirmLabel: 'Esegui Rimborso Ora',
        cancelLabel: 'Annulla Operazione',
      },
    },
  },
  bookingCard: {
    name: 'Booking Card',
    description: 'Hotel booking confirmation',
    payload: {
      component: 'BookingCard',
      props: {
        bookingId: 'BK-2026-0842',
        hotelName: 'Grand Hotel Vesuvio',
        checkIn: '2026-09-15',
        checkOut: '2026-09-20',
        price: 1250,
        guests: 2,
      },
    },
  },
  actionStaging: {
    name: 'Visual Guardrail & Staging',
    description: 'Human-in-the-Loop con visual diff e inline editing',
    payload: {
      component: 'ActionStagingCard',
      props: {
        title: 'Autorizzazione Modifica Database Cluster',
        description:
          "L'agente AI richiede l'autorizzazione per scalare le risorse del database di produzione ed eseguire il backup preventivo.",
        actionId: 'act-db-scale-99',
        actionType: 'database_mutation',
        riskLevel: 'high',
        requiresExplicitAgreement: true,
        confirmLabel: 'Approva ed Esegui Scaling ⚡',
        cancelLabel: 'Annulla Operazione',
        parameters: [
          {
            key: 'clusterName',
            label: 'Nome Database',
            value: 'prod-primary-pg16',
            type: 'text',
            editable: false,
          },
          {
            key: 'targetReplicas',
            label: 'Numero Repliche Read',
            value: 6,
            previousValue: 2,
            type: 'number',
            editable: true,
          },
          {
            key: 'allocatedMemoryGb',
            label: 'Memoria RAM Allocata (GB)',
            value: 32,
            previousValue: 16,
            type: 'number',
            editable: true,
          },
          {
            key: 'enablePreBackup',
            label: 'Backup Preventivo Snapshot',
            value: true,
            type: 'boolean',
            editable: true,
          },
          {
            key: 'maintenanceWindow',
            label: 'Finestra di Manutenzione',
            value: 'Immediate',
            type: 'select',
            options: ['Immediate', 'Tonight at 02:00 UTC', 'Next Weekend'],
            editable: true,
          },
        ],
      },
    },
  },
};


/**
 * Simulate streaming a JSON payload character-by-character.
 * Calls `onChunk` with progressive text snippets and `onDone` when complete.
 */
export function simulateStream(
  scenarioKey: string,
  onChunk: (chunk: IntentStreamChunk) => void,
  onDone: () => void,
  options: { delayMs?: number; chunkSize?: number } = {}
): { cancel: () => void } {
  const { delayMs = 20, chunkSize = 3 } = options;
  const scenario = scenarios[scenarioKey];

  if (!scenario) {
    onDone();
    return { cancel: () => {} };
  }

  const currentScenario = scenario;
  const json = JSON.stringify(currentScenario.payload);
  let position = 0;
  let cancelled = false;

  function sendNextChunk() {
    if (cancelled || position >= json.length) {
      if (!cancelled) {
        // Send the final complete chunk
        onChunk({
          intent: {
            component: currentScenario.payload.component as string,
            props: currentScenario.payload.props as Record<string, unknown>,
          },
          done: true,
        });
        onDone();
      }
      return;
    }

    // Advance position
    const end = Math.min(position + chunkSize, json.length);
    const partialJson = json.slice(0, end);
    position = end;

    // Try to parse the partial JSON and emit a streaming chunk
    try {
      const { parse } = await_partial_json();
      const parsed = parse(partialJson);

      if (parsed && typeof parsed === 'object') {
        const p = parsed as Record<string, unknown>;
        onChunk({
          intent: {
            component: (p.component as string) ?? '',
            props: (p.props as Record<string, unknown>) ?? {},
          },
          done: false,
        });
      }
    } catch {
      // Partial parse failed — this is expected, skip this chunk
    }

    setTimeout(sendNextChunk, delayMs);
  }

  sendNextChunk();

  return {
    cancel: () => {
      cancelled = true;
    },
  };
}

/**
 * Lazy import of partial-json to keep the mock module simple.
 * In the actual implementation this is handled by the core parser.
 */
function await_partial_json() {
  // Simple inline partial JSON parser for the mock
  // In production, the core StreamParser handles this
  return {
    parse: (str: string): unknown => {
      try {
        return JSON.parse(str);
      } catch {
        // Try to fix common incomplete JSON patterns
        let fixed = str;

        // Count open/close braces and brackets
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/]/g) || []).length;

        // Remove trailing comma if present
        fixed = fixed.replace(/,\s*$/, '');

        // Remove incomplete string at the end (unmatched quote)
        const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          fixed += '"';
        }

        // Close open brackets and braces
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixed += ']';
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixed += '}';
        }

        try {
          return JSON.parse(fixed);
        } catch {
          return null;
        }
      }
    },
  };
}

/** Get all available scenario keys */
export function getScenarioKeys(): string[] {
  return Object.keys(scenarios);
}

/** Get scenario metadata */
export function getScenarioInfo(key: string): { name: string; description: string } | undefined {
  const s = scenarios[key];
  return s ? { name: s.name, description: s.description } : undefined;
}
