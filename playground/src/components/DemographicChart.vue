<template>
  <div class="demographic-chart">
    <div class="chart-header">
      <div class="title-wrapper">
        <span class="category-icon">👥</span>
        <div>
          <h3>{{ title }}</h3>
          <span class="category-label">{{ category || 'Dati Demografici' }}</span>
        </div>
      </div>
      <span class="unit-badge">{{ unit }}</span>
    </div>

    <div class="chart-bars">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="bar-group"
        @click="$emit('action', 'select', { label: metric.label, value: metric.value, unit })"
      >
        <div class="bar-info">
          <span class="bar-label">{{ metric.label }}</span>
          <span class="bar-percentage">{{ percentageOfTotal(metric.value) }}%</span>
        </div>
        <div class="bar-track">
          <div
            class="bar-fill"
            :style="{ width: barWidth(metric.value) + '%' }"
          >
            <span class="bar-value">{{ formatNumber(metric.value) }} {{ unit }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-footer">
      <span class="total-label">Popolazione Totale:</span>
      <span class="total-value">{{ formatNumber(totalValue) }} {{ unit }}</span>
    </div>
  </div>
</template>
<script lang="ts">
import { defineIntent } from '@intentui-vue/vue';
import { z } from 'zod';

export const intent = defineIntent({
  description:
    'Usa questo grafico per mostrare dati sulla POPOLAZIONE, numero di abitanti, cittadini residenti, demografia di città, province o nazioni',
  schema: z.object({
    title: z.string().describe('Titolo del grafico demografico (es. Popolazione residente)'),
    category: z.string().optional().describe('Categoria (es. Città italiane, Regioni)'),
    unit: z.string().optional().describe('Unità di misura (es. abitanti, persone, residenti)'),
    metrics: z.array(
      z.object({
        label: z.string().describe('Nome della città, regione o nazione'),
        value: z.number().describe('Numero di abitanti o residenti'),
      })
    ).describe('Dati sulla popolazione per ogni città/regione'),
  }),
});
</script>

<script setup lang="ts">
import { computed } from 'vue';

interface Metric {
  label: string;
  value: number;
}

const props = withDefaults(
  defineProps<{
    title: string;
    category?: string;
    unit?: string;
    metrics: Metric[];
  }>(),
  {
    category: 'Demografia',
    unit: 'abitanti',
  }
);

defineEmits<{
  action: [event: string, data: unknown];
}>();

const maxValue = computed(() => Math.max(...props.metrics.map((m) => m.value), 1));
const totalValue = computed(() => props.metrics.reduce((sum, m) => sum + m.value, 0));

function barWidth(value: number): number {
  return (value / maxValue.value) * 100;
}

function percentageOfTotal(value: number): string {
  if (totalValue.value === 0) return '0';
  return ((value / totalValue.value) * 100).toFixed(1);
}

function formatNumber(n: number): string {
  return n.toLocaleString('it-IT');
}
</script>

<style scoped>
.demographic-chart {
  background: linear-gradient(135deg, #064e3b, #047857);
  border-radius: 1rem;
  padding: 1.5rem;
  color: #ecfdf5;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 4px 20px rgba(6, 78, 59, 0.3);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.category-icon {
  font-size: 1.5rem;
}

.chart-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: white;
}

.category-label {
  font-size: 0.75rem;
  color: #a7f3d0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.unit-badge {
  background: rgba(167, 243, 208, 0.2);
  color: #a7f3d0;
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.chart-bars {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.bar-group {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.bar-group:hover {
  transform: translateX(4px);
}

.bar-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #d1fae5;
  margin-bottom: 0.3rem;
  font-weight: 500;
}

.bar-percentage {
  color: #6ee7b7;
}

.bar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  height: 2rem;
  overflow: hidden;
}

.bar-fill {
  background: linear-gradient(90deg, #10b981, #34d399);
  height: 100%;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.75rem;
  min-width: 4rem;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.bar-value {
  font-size: 0.75rem;
  font-weight: 700;
  color: #064e3b;
  white-space: nowrap;
}

.chart-footer {
  margin-top: 1.25rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-size: 0.85rem;
  color: #a7f3d0;
  font-weight: 500;
}

.total-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
}
</style>
