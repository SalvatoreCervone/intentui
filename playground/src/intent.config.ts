import { createIntentUI } from '@intentui/vue';
import { z } from 'zod';
import SalesChart from './components/SalesChart.vue';
import BookingCard from './components/BookingCard.vue';
import DefaultSkeleton from './components/DefaultSkeleton.vue';

/**
 * IntentUI configuration with demo components.
 * Each component is registered with a Zod schema and description.
 */
export const intentUI = createIntentUI({
  components: {
    SalesChart: {
      component: SalesChart,
      description: 'Interactive sales chart showing metrics over time with filtering options',
      schema: z.object({
        title: z.string().describe('The chart title'),
        timeframe: z.enum(['daily', 'weekly', 'monthly']).describe('Time granularity'),
        metrics: z.array(
          z.object({
            label: z.string().describe('Metric label'),
            value: z.number().describe('Metric value'),
          })
        ).describe('Array of data points to display'),
      }),
    },
    BookingCard: {
      component: BookingCard,
      description: 'Interactive booking confirmation card for hotel reservations',
      schema: z.object({
        bookingId: z.string().describe('Unique booking identifier'),
        hotelName: z.string().describe('Name of the hotel'),
        checkIn: z.string().describe('Check-in date'),
        checkOut: z.string().describe('Check-out date'),
        price: z.number().describe('Total price in EUR'),
        guests: z.number().describe('Number of guests'),
      }),
    },
  },
  fallback: DefaultSkeleton,
});

// Export tool definitions (would be sent to your LLM backend)
export const toolsDefinition = intentUI.getToolsDefinition();
