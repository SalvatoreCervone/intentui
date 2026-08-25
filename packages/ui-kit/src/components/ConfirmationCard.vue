<template>
  <div class="intent-confirmation-card" :class="`severity-${severity}`">
    <div class="card-header">
      <div class="icon-title">
        <span class="severity-icon">{{ severityIcon }}</span>
        <h3>{{ title }}</h3>
      </div>
      <span class="severity-badge">{{ severity.toUpperCase() }}</span>
    </div>

    <p class="message-text">{{ message }}</p>

    <!-- Optional Detail Rows -->
    <div v-if="details && details.length > 0" class="details-box">
      <div v-for="d in details" :key="d.label" class="detail-row">
        <span class="detail-label">{{ d.label }}</span>
        <span class="detail-value">{{ d.value }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions-row">
      <button
        type="button"
        class="btn-cancel"
        @click="handleCancel"
      >
        {{ cancelLabel || 'Annulla' }}
      </button>
      <button
        type="button"
        class="btn-confirm"
        :class="`btn-${severity}`"
        @click="handleConfirm"
      >
        {{ confirmLabel || 'Conferma ed Esegui' }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineIntent } from '@intentui-vue/core';
import { z } from 'zod';

export const intent = defineIntent({
  description:
    'Card di conferma e approvazione per operazioni critiche o transazionali (eliminazione, pagamenti, invio ordini, modifiche permanenti)',
  schema: z.object({
    title: z.string().describe('Titolo dell operazione da confermare (es. Conferma Rimborso)'),
    message: z.string().describe('Spiegazione chiara delle conseguenze dell azione'),
    severity: z.enum(['info', 'warning', 'danger']).optional().describe('Livello di gravità dell operazione (info, warning, danger)'),
    details: z.array(
      z.object({
        label: z.string().describe('Etichetta del dettaglio'),
        value: z.string().describe('Valore del dettaglio'),
      })
    ).optional().describe('Dettagli riassuntivi della transazione'),
    confirmLabel: z.string().optional().describe('Testo del pulsante di conferma'),
    cancelLabel: z.string().optional().describe('Testo del pulsante di annullamento'),
  }),
});
</script>

<script setup lang="ts">
import { computed } from 'vue';

interface DetailItem {
  label: string;
  value: string;
}

const props = withDefaults(
  defineProps<{
    title: string;
    message: string;
    severity?: 'info' | 'warning' | 'danger';
    details?: DetailItem[];
    confirmLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    severity: 'info',
    confirmLabel: 'Conferma ed Esegui',
    cancelLabel: 'Annulla',
  }
);

const emit = defineEmits<{
  submit: [data: Record<string, any>];
  action: [event: string, data: unknown];
}>();

const severityIcon = computed(() => {
  if (props.severity === 'danger') return '🚨';
  if (props.severity === 'warning') return '⚠️';
  return 'ℹ️';
});

function handleConfirm() {
  emit('submit', { confirmed: true, severity: props.severity });
}

function handleCancel() {
  emit('action', 'cancel', { confirmed: false });
}
</script>

<style scoped>
.intent-confirmation-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  color: #f1f5f9;
  font-family: inherit;
}

.intent-confirmation-card.severity-danger {
  border-color: rgba(239, 68, 68, 0.35);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
}

.intent-confirmation-card.severity-warning {
  border-color: rgba(234, 179, 8, 0.35);
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.icon-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.icon-title h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
}

.severity-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  letter-spacing: 0.05em;
}

.severity-danger .severity-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.severity-warning .severity-badge {
  background: rgba(234, 179, 8, 0.2);
  color: #facc15;
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.severity-info .severity-badge {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.message-text {
  font-size: 0.9375rem;
  color: #cbd5e1;
  line-height: 1.5;
  margin: 0 0 1rem 0;
}

.details-box {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
}

.detail-label {
  color: #94a3b8;
}

.detail-value {
  font-weight: 600;
  color: #ffffff;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn-confirm {
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s, opacity 0.15s;
}

.btn-confirm:hover {
  transform: translateY(-1px);
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #0f172a;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.btn-info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
</style>
