<template>
  <div class="booking-card">
    <div class="card-header">
      <span class="booking-id">{{ bookingId }}</span>
      <span class="status-badge">Confirmed ✓</span>
    </div>

    <h3 class="hotel-name">🏨 {{ hotelName }}</h3>

    <div class="details-grid">
      <div class="detail">
        <span class="detail-label">Check-in</span>
        <span class="detail-value">{{ formatDate(checkIn) }}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Check-out</span>
        <span class="detail-value">{{ formatDate(checkOut) }}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Guests</span>
        <span class="detail-value">{{ guests }} {{ guests === 1 ? 'guest' : 'guests' }}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Total</span>
        <span class="detail-value price">€{{ price.toLocaleString('it-IT') }}</span>
      </div>
    </div>

    <div class="card-actions">
      <button class="btn btn-secondary" @click="$emit('action', 'modify', { bookingId })">
        ✏️ Modify
      </button>
      <button class="btn btn-primary" @click="$emit('submit', { bookingId, confirmed: true })">
        ✅ Confirm
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineIntent } from '@intentui/vue';
import { z } from 'zod';

export const intent = defineIntent({
  description:
    'Card interattiva per confermare o modificare prenotazioni di hotel, stanze e viaggi',
  schema: z.object({
    bookingId: z.string().describe('Identificativo della prenotazione'),
    hotelName: z.string().describe('Nome dell hotel'),
    checkIn: z.string().describe('Data di check-in (YYYY-MM-DD)'),
    checkOut: z.string().describe('Data di check-out (YYYY-MM-DD)'),
    price: z.number().describe('Prezzo totale in EUR'),
    guests: z.number().describe('Numero di ospiti'),
  }),
});
</script>

<script setup lang="ts">
defineProps<{
  bookingId: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  price: number;
  guests: number;
}>();

defineEmits<{
  action: [event: string, data: unknown];
  submit: [data: unknown];
}>();

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
</script>

<style scoped>
.booking-card {
  background: linear-gradient(135deg, #0c4a6e, #164e63);
  border-radius: 1rem;
  padding: 1.5rem;
  color: #e0f2fe;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.booking-id {
  font-size: 0.75rem;
  color: #7dd3fc;
  font-weight: 500;
  letter-spacing: 0.05em;
}

.status-badge {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
  padding: 0.2rem 0.6rem;
  border-radius: 2rem;
  font-size: 0.7rem;
  font-weight: 600;
}

.hotel-name {
  margin: 0 0 1.25rem;
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.detail {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.detail-label {
  font-size: 0.7rem;
  color: #7dd3fc;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
}

.detail-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: white;
}

.detail-value.price {
  color: #67e8f9;
  font-size: 1.1rem;
}

.card-actions {
  display: flex;
  gap: 0.75rem;
}

.btn {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #bae6fd;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.18);
}

.btn-primary {
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #38bdf8, #22d3ee);
  transform: translateY(-1px);
  box-shadow: 0 2px 12px rgba(14, 165, 233, 0.4);
}
</style>
