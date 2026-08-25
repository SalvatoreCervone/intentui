<template>
  <div class="intent-data-table-wrapper">
    <div class="table-header">
      <div class="title-section">
        <h3>{{ title }}</h3>
        <span class="row-count">{{ filteredRows.length }} elementi</span>
      </div>
      <div v-if="searchable" class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cerca nella tabella..."
          class="search-input"
        />
      </div>
    </div>

    <div class="table-container">
      <table class="intent-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              @click="toggleSort(col.key)"
              :class="{ sortable: true, sorted: sortKey === col.key }"
            >
              <div class="th-content">
                <span>{{ col.label }}</span>
                <span class="sort-icon">{{ sortIcon(col.key) }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in paginatedRows"
            :key="idx"
            class="table-row"
            @click="$emit('action', 'row_click', row)"
          >
            <td v-for="col in columns" :key="col.key">
              <!-- Badge Type -->
              <span
                v-if="col.type === 'badge'"
                class="status-pill"
                :class="getBadgeClass(row[col.key])"
              >
                {{ row[col.key] }}
              </span>

              <!-- Currency Type -->
              <span v-else-if="col.type === 'currency'" class="currency-value">
                €{{ formatCurrency(row[col.key]) }}
              </span>

              <!-- Default / Text / Number -->
              <span v-else>
                {{ row[col.key] }}
              </span>
            </td>
          </tr>
          <tr v-if="paginatedRows.length === 0">
            <td :colspan="columns.length" class="empty-state">
              Nessun dato trovato
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    <div v-if="totalPages > 1" class="table-footer">
      <span class="pagination-info">
        Pagina {{ currentPage }} di {{ totalPages }}
      </span>
      <div class="pagination-buttons">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          ← Prec
        </button>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          Succ →
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineIntent } from '@intentui-vue/vue';
import { z } from 'zod';

export const intent = defineIntent({
  description:
    'Tabella dati interattiva per visualizzare elenchi strutturati (utenti, ordini, transazioni, prodotti, log) con ordinamento e ricerca',
  schema: z.object({
    title: z.string().describe('Titolo descrittivo della tabella'),
    searchable: z.boolean().optional().describe('Se abilitare la barra di ricerca rapida (default: true)'),
    pageSize: z.number().optional().describe('Numero di righe per pagina (default: 5)'),
    columns: z.array(
      z.object({
        key: z.string().describe('Chiave identificativa della proprietà nell oggetto riga'),
        label: z.string().describe('Intestazione visibile della colonna'),
        type: z.enum(['text', 'number', 'currency', 'badge', 'date']).optional().describe('Formato visuale della cella'),
      })
    ).describe('Definizione delle colonne della tabella'),
    rows: z.array(z.record(z.any())).describe('Dati delle righe da visualizzare'),
  }),
});
</script>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'badge' | 'date';
}

const props = withDefaults(
  defineProps<{
    title?: string;
    columns?: Column[];
    rows?: Record<string, any>[];
    data?: Record<string, any>[];
    searchable?: boolean;
    pageSize?: number;
  }>(),
  {
    title: 'Tabella Dati',
    columns: () => [],
    rows: () => [],
    data: () => [],
    searchable: true,
    pageSize: 5,
  }
);

defineEmits<{
  action: [event: string, data: unknown];
}>();

const searchQuery = ref('');
const sortKey = ref<string | null>(null);
const sortOrder = ref<'asc' | 'desc'>('asc');
const currentPage = ref(1);

function toggleSort(key: string) {
  if (sortKey.value === key) {
    if (sortOrder.value === 'asc') {
      sortOrder.value = 'desc';
    } else {
      sortKey.value = null;
      sortOrder.value = 'asc';
    }
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
}

function sortIcon(key: string): string {
  if (sortKey.value !== key) return '↕';
  return sortOrder.value === 'asc' ? '↑' : '↓';
}

const rawRows = computed(() => {
  if (Array.isArray(props.rows) && props.rows.length > 0) return props.rows;
  if (Array.isArray(props.data) && props.data.length > 0) return props.data;
  return [];
});

const filteredRows = computed(() => {
  let result = [...rawRows.value];

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }

  if (sortKey.value) {
    const key = sortKey.value;
    result.sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      const compare = valA > valB ? 1 : -1;
      return sortOrder.value === 'asc' ? compare : -compare;
    });
  }

  return result;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredRows.value.length / props.pageSize))
);

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize;
  return filteredRows.value.slice(start, start + props.pageSize);
});

function formatCurrency(val: any): string {
  const num = Number(val);
  return isNaN(num) ? String(val) : num.toLocaleString('it-IT', { minimumFractionDigits: 2 });
}

function getBadgeClass(val: any): string {
  const str = String(val).toLowerCase();
  if (['attivo', 'completato', 'pagato', 'success', 'confermato'].some((k) => str.includes(k))) return 'badge-success';
  if (['in attesa', 'pending', 'in corso', 'warning'].some((k) => str.includes(k))) return 'badge-warning';
  if (['annullato', 'fallito', 'errore', 'danger', 'rifiutato'].some((k) => str.includes(k))) return 'badge-danger';
  return 'badge-neutral';
}
</script>

<style scoped>
.intent-data-table-wrapper {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  color: #f1f5f9;
  font-family: inherit;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-section h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
}

.row-count {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.search-input {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  color: #ffffff;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #6366f1;
}

.table-container {
  overflow-x: auto;
}

.intent-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875rem;
}

.intent-table th {
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  user-select: none;
}

.intent-table th.sortable {
  cursor: pointer;
}

.th-content {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.sort-icon {
  font-size: 0.75rem;
  color: #64748b;
}

.intent-table th.sorted .sort-icon {
  color: #818cf8;
}

.table-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.15s;
  cursor: pointer;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.table-row td {
  padding: 0.75rem 1rem;
  color: #e2e8f0;
}

.currency-value {
  font-weight: 600;
  color: #38bdf8;
}

.status-pill {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.badge-warning {
  background: rgba(234, 179, 8, 0.15);
  color: #facc15;
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.badge-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.badge-neutral {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #64748b;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.pagination-info {
  font-size: 0.8125rem;
  color: #94a3b8;
}

.pagination-buttons {
  display: flex;
  gap: 0.5rem;
}

.page-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
