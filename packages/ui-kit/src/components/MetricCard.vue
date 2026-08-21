<template>
  <div class="intent-metric-card" @click="$emit('action', 'click', { title, value, unit })">
    <div class="metric-header">
      <span class="metric-title">{{ title }}</span>
      <span v-if="timeframe" class="metric-timeframe">{{ timeframe }}</span>
    </div>

    <div class="metric-body">
      <div class="metric-value-wrapper">
        <span v-if="unitPosition === 'prefix'" class="metric-unit">{{ unit }}</span>
        <span class="metric-value">{{ formattedValue }}</span>
        <span v-if="unitPosition === 'suffix'" class="metric-unit">{{ unit }}</span>
      </div>

      <div
        v-if="change !== undefined"
        class="metric-badge"
        :class="computedTrend"
      >
        <span class="trend-icon">{{ trendIcon }}</span>
        <span>{{ change > 0 ? `+${change}%` : `${change}%` }}</span>
      </div>
    </div>

    <p v-if="description" class="metric-desc">{{ description }}</p>
  </div>
</template>

<script lang="ts">
import { defineIntent } from '@intentui/vue';
import { z } from 'zod';

export const intent = defineIntent({
  description:
    'Card KPI per mostrare metriche chiave, indicatori di performance, statistiche sintetiche e percentuali di crescita',
  schema: z.object({
    title: z.string().describe('Titolo della metrica (es. Fatturato Mensile, Nuovi Utenti, Tasso di Conversione)'),
    value: z.union([z.number(), z.string()]).describe('Valore numerico o stringa della metrica'),
    unit: z.string().optional().describe('Unità di misura o simbolo valuta (es. €, $, %, utenti, ordini)'),
    change: z.number().optional().describe('Variazione percentuale rispetto al periodo precedente (es. 12.5 o -3.2)'),
    trend: z.enum(['up', 'down', 'neutral']).optional().describe('Direzione del trend (up, down, neutral)'),
    timeframe: z.string().optional().describe('Periodo temporale di riferimento (es. vs mese scorso, Q2 2026)'),
    description: z.string().optional().describe('Breve spiegazione o contesto della metrica'),
  }),
});
</script>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    title: string;
    value: number | string;
    unit?: string;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
    timeframe?: string;
    description?: string;
  }>(),
  {
    unit: '',
    timeframe: '',
    description: '',
  }
);

defineEmits<{
  action: [event: string, data: unknown];
}>();

const unitPosition = computed(() => {
  if (!props.unit) return 'none';
  if (['€', '$', '£', '¥'].includes(props.unit)) return 'prefix';
  return 'suffix';
});

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString('it-IT');
  }
  return props.value;
});

const computedTrend = computed(() => {
  if (props.trend) return props.trend;
  if (props.change !== undefined) {
    if (props.change > 0) return 'up';
    if (props.change < 0) return 'down';
  }
  return 'neutral';
});

const trendIcon = computed(() => {
  if (computedTrend.value === 'up') return '↑';
  if (computedTrend.value === 'down') return '↓';
  return '→';
});
</script>

<style scoped>
.intent-metric-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  font-family: inherit;
  color: #f1f5f9;
}

.intent-metric-card:hover {
  transform: translateY(-2px);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 12px 28px rgba(99, 102, 241, 0.15);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.metric-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-timeframe {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}

.metric-body {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.metric-value-wrapper {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.metric-unit {
  font-size: 1.25rem;
  font-weight: 600;
  color: #cbd5e1;
}

.metric-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 8px;
}

.metric-badge.up {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.metric-badge.down {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.metric-badge.neutral {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.metric-desc {
  margin-top: 0.75rem;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.4;
}
</style>
