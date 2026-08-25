<template>
  <div class="intent-action-staging" :class="[`risk-${riskLevel}`, { 'has-diffs': hasDifferences }]">
    <!-- Header -->
    <div class="staging-header">
      <div class="header-main">
        <span class="risk-icon">{{ riskIcon }}</span>
        <div class="title-group">
          <h3 class="staging-title">{{ title }}</h3>
          <span class="action-id" v-if="actionId">ID: {{ actionId }}</span>
        </div>
      </div>
      <div class="badge-group">
        <span class="risk-badge">{{ riskLevel.toUpperCase() }} RISK</span>
        <span class="type-badge" v-if="actionType">{{ actionType }}</span>
      </div>
    </div>

    <!-- Description -->
    <p class="staging-description">{{ description }}</p>

    <!-- Staged Parameters Diff & Editor -->
    <div class="parameters-container">
      <div class="parameters-header">
        <span class="section-label">⚙️ Parametri in Staging (Modificabili)</span>
        <span class="diff-counter" v-if="modifiedCount > 0">{{ modifiedCount }} modificati</span>
      </div>

      <div class="parameter-list">
        <div
          v-for="param in currentParams"
          :key="param.key"
          class="param-row"
          :class="{ 'is-modified': isParamModified(param) }"
        >
          <div class="param-meta">
            <span class="param-label">{{ param.label || param.key }}</span>
            <span class="param-key">{{ param.key }}</span>
          </div>

          <!-- Parameter Value / Editor -->
          <div class="param-control">
            <!-- Boolean Toggle -->
            <label v-if="param.type === 'boolean'" class="toggle-control">
              <input
                type="checkbox"
                v-model="paramValues[param.key]"
                @change="handleParamChange(param.key)"
                :disabled="param.editable === false"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-text">{{ paramValues[param.key] ? 'Attivo' : 'Disattivo' }}</span>
            </label>

            <!-- Select Dropdown -->
            <select
              v-else-if="param.type === 'select' && param.options"
              v-model="paramValues[param.key]"
              class="staging-input select-input"
              @change="handleParamChange(param.key)"
              :disabled="param.editable === false"
            >
              <option v-for="opt in param.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <!-- Number / Text Input -->
            <input
              v-else
              :type="param.type === 'number' ? 'number' : 'text'"
              v-model="paramValues[param.key]"
              class="staging-input"
              @input="handleParamChange(param.key)"
              :disabled="param.editable === false"
              placeholder="Inserisci valore..."
            />

            <!-- Visual Diff Comparison -->
            <div v-if="isParamModified(param)" class="param-diff-badge">
              <span class="old-val">{{ param.previousValue }}</span>
              <span class="arrow">➔</span>
              <span class="new-val">{{ paramValues[param.key] }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Safety Agreement Checkbox for High/Critical risk -->
    <div v-if="requiresExplicitAgreement || riskLevel === 'critical' || riskLevel === 'high'" class="safety-agreement">
      <label class="agreement-label">
        <input type="checkbox" v-model="agreementChecked" />
        <span>Dichiaro di aver verificato i parametri e approvo l'esecuzione.</span>
      </label>
    </div>

    <!-- Action Buttons -->
    <div class="staging-actions">
      <button type="button" class="btn-staging-cancel" @click="handleCancel">
        {{ cancelLabel }}
      </button>

      <button
        type="button"
        class="btn-staging-confirm"
        :class="`btn-${riskLevel}`"
        :disabled="isConfirmDisabled"
        @click="handleConfirm"
      >
        <span class="btn-icon">⚡</span>
        <span>{{ confirmLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineIntent } from '@intentui-vue/core';
import { z } from 'zod';

export const intent = defineIntent({
  description:
    'Area di staging e guardrail visuale per esaminare, modificare i parametri e autorizzare azioni AI critiche prima del commit (Human-in-the-loop)',
  schema: z.object({
    title: z.string().describe('Titolo dell operazione (es. Modifica Permessi DB, Esecuzione Transazione)'),
    description: z.string().describe('Descrizione dettagliata dell impatto dell azione sul sistema'),
    actionId: z.string().optional().describe('Identificativo univoco dell azione o tool call'),
    actionType: z.string().optional().describe('Categoria azione (es. database_mutation, payment, delete)'),
    riskLevel: z
      .enum(['low', 'medium', 'high', 'critical'])
      .optional()
      .describe('Livello di rischio associato all operazione'),
    parameters: z
      .array(
        z.object({
          key: z.string().describe('Identificativo della proprietà'),
          label: z.string().optional().describe('Etichetta leggibile dall utente'),
          value: z.union([z.string(), z.number(), z.boolean()]).describe('Valore proposto dall AI'),
          previousValue: z.union([z.string(), z.number(), z.boolean()]).optional().describe('Valore precedente per mostrare il diff'),
          type: z.enum(['text', 'number', 'boolean', 'select']).optional().describe('Tipo di input UI'),
          options: z.array(z.string()).optional().describe('Opzioni disponibili in caso di select'),
          editable: z.boolean().optional().describe('Se il parametro è modificabile dall utente'),
        })
      )
      .describe('Lista di parametri configurabili per l operazione'),
    requiresExplicitAgreement: z.boolean().optional().describe('Se richiedere la checkbox esplicita di consenso'),
    confirmLabel: z.string().optional().describe('Etichetta pulsante di esecuzione'),
    cancelLabel: z.string().optional().describe('Etichetta pulsante di rifiuto'),
  }),
});
</script>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';

export interface StagingParameter {
  key: string;
  label?: string;
  value: string | number | boolean;
  previousValue?: string | number | boolean;
  type?: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
  editable?: boolean;
}

const props = withDefaults(
  defineProps<{
    title: string;
    description: string;
    actionId?: string;
    actionType?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    parameters: StagingParameter[];
    requiresExplicitAgreement?: boolean;
    confirmLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    riskLevel: 'medium',
    confirmLabel: 'Approva ed Esegui',
    cancelLabel: 'Rifiuta Operazione',
    requiresExplicitAgreement: false,
  }
);

const emit = defineEmits<{
  submit: [payload: { confirmed: boolean; actionId?: string; parameters: Record<string, any> }];
  action: [event: string, data: unknown];
  stateChange: [diff: Record<string, any>, previous?: Record<string, any>];
}>();

const agreementChecked = ref(false);

// Reactive state for editable parameters
const paramValues = reactive<Record<string, any>>({});
props.parameters.forEach((p) => {
  paramValues[p.key] = p.value;
});

const currentParams = computed(() => props.parameters);

const riskIcon = computed(() => {
  switch (props.riskLevel) {
    case 'critical':
      return '🛑';
    case 'high':
      return '⚠️';
    case 'medium':
      return '🛡️';
    case 'low':
    default:
      return 'ℹ️';
  }
});

function isParamModified(param: StagingParameter): boolean {
  if (param.previousValue === undefined) return false;
  return String(paramValues[param.key]) !== String(param.previousValue);
}

const modifiedCount = computed(() => {
  return props.parameters.filter((p) => isParamModified(p)).length;
});

const hasDifferences = computed(() => modifiedCount.value > 0);

const isConfirmDisabled = computed(() => {
  if (props.requiresExplicitAgreement || props.riskLevel === 'critical' || props.riskLevel === 'high') {
    return !agreementChecked.value;
  }
  return false;
});

function handleParamChange(key: string) {
  const originalParam = props.parameters.find((p) => p.key === key);
  emit(
    'stateChange',
    { [key]: paramValues[key] },
    originalParam ? { [key]: originalParam.value } : undefined
  );
}

function handleConfirm() {
  const payload = {
    confirmed: true,
    actionId: props.actionId,
    parameters: { ...paramValues },
  };
  emit('submit', payload);
}

function handleCancel() {
  const payload = {
    confirmed: false,
    actionId: props.actionId,
    parameters: { ...paramValues },
  };
  emit('action', 'cancel', payload);
}

</script>

<style scoped>
.intent-action-staging {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  color: #f8fafc;
  font-family: inherit;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
  margin: 1rem 0;
  transition: all 0.25s ease;
}

.staging-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.risk-icon {
  font-size: 1.5rem;
}

.title-group {
  display: flex;
  flex-direction: column;
}

.staging-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: #f8fafc;
}

.action-id {
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: monospace;
}

.badge-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.risk-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  letter-spacing: 0.05em;
}

.type-badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

/* Risk level styling */
.risk-low {
  border-left: 4px solid #3b82f6;
}
.risk-low .risk-badge {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.risk-medium {
  border-left: 4px solid #f59e0b;
}
.risk-medium .risk-badge {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.risk-high {
  border-left: 4px solid #f97316;
}
.risk-high .risk-badge {
  background: rgba(249, 115, 22, 0.2);
  color: #fb923c;
  border: 1px solid rgba(249, 115, 22, 0.4);
}

.risk-critical {
  border-left: 4px solid #ef4444;
  background: rgba(30, 15, 20, 0.85);
}
.risk-critical .risk-badge {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.staging-description {
  color: #cbd5e1;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1.25rem 0;
}

/* Parameters box */
.parameters-container {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1.25rem;
}

.parameters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.diff-counter {
  font-size: 0.75rem;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.parameter-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.param-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.5rem;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.param-row.is-modified {
  border-color: rgba(56, 189, 248, 0.3);
  background: rgba(56, 189, 248, 0.05);
}

.param-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.param-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #e2e8f0;
}

.param-key {
  font-size: 0.75rem;
  color: #64748b;
  font-family: monospace;
}

.param-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.staging-input {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.375rem;
  color: #f8fafc;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  flex: 1;
  min-width: 140px;
  outline: none;
  transition: border-color 0.2s;
}

.staging-input:focus {
  border-color: #6366f1;
}

.param-diff-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
  background: rgba(0, 0, 0, 0.3);
}

.old-val {
  color: #ef4444;
  text-decoration: line-through;
}

.arrow {
  color: #94a3b8;
}

.new-val {
  color: #22c55e;
  font-weight: 600;
}

/* Agreement */
.safety-agreement {
  margin-bottom: 1.25rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px dashed rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
}

.agreement-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: #fca5a5;
  cursor: pointer;
}

/* Actions */
.staging-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-staging-cancel {
  padding: 0.6rem 1.2rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-staging-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-staging-confirm {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.4rem;
  border-radius: 0.5rem;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.btn-low {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}
.btn-medium {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}
.btn-high {
  background: linear-gradient(135deg, #f97316, #ea580c);
}
.btn-critical {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.btn-staging-confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.5);
}
</style>
