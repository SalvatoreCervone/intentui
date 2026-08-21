<template>
  <div class="sales-chart">
    <div class="chart-header">
      <h3>📊 {{ title }}</h3>
      <span class="timeframe-badge">{{ timeframe }}</span>
    </div>
    <div class="chart-bars">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="bar-group"
        @click="$emit('action', 'select', { label: metric.label, value: metric.value })"
      >
        <div class="bar-label">{{ metric.label }}</div>
        <div class="bar-track">
          <div
            class="bar-fill"
            :style="{ width: barWidth(metric.value) + '%' }"
          >
            <span class="bar-value">€{{ formatNumber(metric.value) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="chart-footer">
      <span class="total">Total: €{{ formatNumber(totalValue) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Metric {
  label: string;
  value: number;
}

const props = defineProps<{
  title: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  metrics: Metric[];
}>();

defineEmits<{
  action: [event: string, data: unknown];
}>();

const maxValue = computed(() => Math.max(...props.metrics.map((m) => m.value), 1));
const totalValue = computed(() => props.metrics.reduce((sum, m) => sum + m.value, 0));

function barWidth(value: number): number {
  return (value / maxValue.value) * 100;
}

function formatNumber(n: number): string {
  return n.toLocaleString('it-IT');
}
</script>

<style scoped>
.sales-chart {
  background: linear-gradient(135deg, #1e1b4b, #312e81);
  border-radius: 1rem;
  padding: 1.5rem;
  color: #e0e7ff;
  font-family: 'Inter', sans-serif;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.chart-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.timeframe-badge {
  background: rgba(129, 140, 248, 0.2);
  color: #a5b4fc;
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.chart-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bar-group {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.bar-group:hover {
  transform: translateX(4px);
}

.bar-label {
  font-size: 0.8rem;
  color: #c7d2fe;
  margin-bottom: 0.25rem;
}

.bar-track {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  height: 2rem;
  overflow: hidden;
}

.bar-fill {
  background: linear-gradient(90deg, #6366f1, #818cf8);
  height: 100%;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  min-width: 3rem;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.bar-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  white-space: nowrap;
}

.chart-footer {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: right;
}

.total {
  font-size: 0.9rem;
  font-weight: 600;
  color: #a5b4fc;
}
</style>
