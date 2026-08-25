<template>
  <div class="intent-form-card">
    <div class="form-header">
      <h3>📝 {{ title }}</h3>
      <p v-if="description" class="form-desc">{{ description }}</p>
    </div>

    <form @submit.prevent="handleSubmit" class="intent-form-body">
      <div v-for="field in fields" :key="field.name" class="form-group">
        <label class="field-label">
          {{ field.label }}
          <span v-if="field.required" class="required-star">*</span>
        </label>

        <!-- Select dropdown -->
        <select
          v-if="field.type === 'select'"
          v-model="formData[field.name]"
          class="form-select"
          :required="field.required"
        >
          <option value="" disabled selected>Seleziona un'opzione...</option>
          <option
            v-for="opt in field.options || []"
            :key="opt"
            :value="opt"
          >
            {{ opt }}
          </option>
        </select>

        <!-- Textarea -->
        <textarea
          v-else-if="field.type === 'textarea'"
          v-model="formData[field.name]"
          class="form-textarea"
          :placeholder="field.placeholder || ''"
          :required="field.required"
          rows="3"
        />

        <!-- Checkbox -->
        <div v-else-if="field.type === 'checkbox'" class="checkbox-wrapper">
          <input
            v-model="formData[field.name]"
            type="checkbox"
            :id="field.name"
            class="form-checkbox"
          />
          <label :for="field.name" class="checkbox-text">{{ field.placeholder || 'Attiva' }}</label>
        </div>

        <!-- Text / Number input -->
        <input
          v-else
          v-model="formData[field.name]"
          :type="field.type === 'number' ? 'number' : 'text'"
          class="form-input"
          :placeholder="field.placeholder || ''"
          :required="field.required"
        />
      </div>

      <div class="form-actions">
        <button type="submit" class="submit-btn" :disabled="isSubmitting">
          {{ submitLabel || 'Invia Dati 🚀' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineIntent } from '@intentui-vue/core';
import { z } from 'zod';

export const intent = defineIntent({
  description:
    'Form interattivo dinamico per raccogliere input dall utente (dati utente, preferenze, parametri, filtri) e inviarli all AI',
  schema: z.object({
    title: z.string().describe('Titolo del form'),
    description: z.string().optional().describe('Descrizione o istruzioni per la compilazione'),
    submitLabel: z.string().optional().describe('Testo del pulsante di invio'),
    fields: z.array(
      z.object({
        name: z.string().describe('Nome della proprietà/chiave nel payload restituito'),
        label: z.string().describe('Etichetta visibile del campo'),
        type: z.enum(['text', 'number', 'select', 'textarea', 'checkbox']).describe('Tipo di input'),
        placeholder: z.string().optional().describe('Placeholder descrittivo'),
        options: z.array(z.string()).optional().describe('Opzioni selezionabili (per tipo select)'),
        required: z.boolean().optional().describe('Se il campo è obbligatorio'),
        defaultValue: z.any().optional().describe('Valore predefinito'),
      })
    ).describe('Campi del form'),
  }),
});
</script>

<script setup lang="ts">
import { ref, reactive } from 'vue';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: any;
}

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    submitLabel?: string;
    fields: Field[];
  }>(),
  {
    description: '',
    submitLabel: 'Invia Dati 🚀',
  }
);

const emit = defineEmits<{
  submit: [data: Record<string, any>];
  action: [event: string, data: unknown];
}>();

const formData = reactive<Record<string, any>>({});
const isSubmitting = ref(false);

// Initialize form default values
props.fields.forEach((f) => {
  if (f.defaultValue !== undefined) {
    formData[f.name] = f.defaultValue;
  } else if (f.type === 'checkbox') {
    formData[f.name] = false;
  } else {
    formData[f.name] = '';
  }
});

function handleSubmit() {
  isSubmitting.value = true;
  emit('submit', { ...formData });
}
</script>

<style scoped>
.intent-form-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  color: #f1f5f9;
  font-family: inherit;
}

.form-header h3 {
  margin: 0 0 0.4rem 0;
  font-size: 1.25rem;
  color: #ffffff;
}

.form-desc {
  margin: 0 0 1.25rem 0;
  font-size: 0.875rem;
  color: #94a3b8;
  line-height: 1.4;
}

.intent-form-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #cbd5e1;
}

.required-star {
  color: #f87171;
  margin-left: 0.2rem;
}

.form-input,
.form-select,
.form-textarea {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  color: #ffffff;
  font-size: 0.875rem;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.form-checkbox {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: #6366f1;
  cursor: pointer;
}

.checkbox-text {
  font-size: 0.875rem;
  color: #cbd5e1;
  cursor: pointer;
}

.form-actions {
  margin-top: 0.75rem;
  display: flex;
  justify-content: flex-end;
}

.submit-btn {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.65rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  transition: transform 0.15s, opacity 0.15s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
