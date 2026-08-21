import { createIntentUI } from '@intentui/vue';
import { z } from 'zod';
import SalesChart from './components/SalesChart.vue';
import DemographicChart from './components/DemographicChart.vue';
import BookingCard from './components/BookingCard.vue';
import DefaultSkeleton from './components/DefaultSkeleton.vue';

/**
 * IntentUI configuration with distinct demo components.
 * Each component is registered with its specific purpose and Zod schema.
 */
export const intentUI = createIntentUI({
  components: {
    // 📊 1. Specifico per Vendite, Fatturato, Finanza, E-commerce (€ / $)
    SalesChart: {
      component: SalesChart,
      description:
        'Usa questo grafico ESCLUSIVAMENTE per mostrare vendite commerciali, fatturato, ricavi, ordini e andamento finanziario in denaro (EUR/USD)',
      schema: z.object({
        title: z.string().describe('Titolo del grafico di vendita'),
        timeframe: z.enum(['daily', 'weekly', 'monthly']).describe('Granularità temporale'),
        metrics: z.array(
          z.object({
            label: z.string().describe('Mese o periodo di vendita'),
            value: z.number().describe('Importo vendite in euro'),
          })
        ).describe('Dati di vendita'),
      }),
    },

    // 👥 2. Specifico per Popolazione, Demografia, Cittadini, Abitanti, Persone
    DemographicChart: {
      component: DemographicChart,
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
    },

    // 🏨 3. Specifico per Prenotazioni Hotel e Viaggi
    BookingCard: {
      component: BookingCard,
      description: 'Card interattiva per confermare o modificare prenotazioni di hotel, stanze e viaggi',
      schema: z.object({
        bookingId: z.string().describe('Identificativo della prenotazione'),
        hotelName: z.string().describe('Nome dell hotel'),
        checkIn: z.string().describe('Data di check-in (YYYY-MM-DD)'),
        checkOut: z.string().describe('Data di check-out (YYYY-MM-DD)'),
        price: z.number().describe('Prezzo totale in EUR'),
        guests: z.number().describe('Numero di ospiti'),
      }),
    },
  },
  fallback: DefaultSkeleton,
});

// Export tool definitions for the LLMs
export const toolsDefinition = intentUI.getToolsDefinition();
