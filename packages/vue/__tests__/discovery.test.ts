import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { z } from 'zod';
import { defineIntent } from '@intentui/core';
import { autoDiscoverComponents, createIntentUI } from '../src';

describe('autoDiscoverComponents', () => {
  const DummySalesComponent = defineComponent({
    name: 'SalesChart',
    render() {
      return h('div', 'Sales Chart');
    },
  });

  const DummyBookingComponent = defineComponent({
    name: 'BookingCard',
    render() {
      return h('div', 'Booking Card');
    },
  });

  it('should define intent using defineIntent helper', () => {
    const schema = z.object({ title: z.string() });
    const intent = defineIntent({
      description: 'Test chart',
      schema,
    });

    expect(intent.description).toBe('Test chart');
    expect(intent.schema).toBe(schema);
  });

  it('should auto-discover components with inline intent export', () => {
    const mockGlob = {
      './components/SalesChart.vue': {
        default: DummySalesComponent,
        intent: defineIntent({
          description: 'Sales chart component',
          schema: z.object({
            title: z.string(),
            revenue: z.number(),
          }),
        }),
      },
      './components/BookingCard.vue': {
        default: DummyBookingComponent,
        intent: defineIntent({
          description: 'Hotel booking card',
          schema: z.object({
            hotelName: z.string(),
          }),
        }),
      },
    };

    const components = autoDiscoverComponents(mockGlob);

    expect(Object.keys(components)).toEqual(['SalesChart', 'BookingCard']);
    expect(components.SalesChart.component).toBe(DummySalesComponent);
    expect(components.SalesChart.description).toBe('Sales chart component');
    expect(components.BookingCard.component).toBe(DummyBookingComponent);
    expect(components.BookingCard.description).toBe('Hotel booking card');
  });

  it('should merge companion .vue and .schema.ts files', () => {
    const mockGlob = {
      './components/SalesChart.vue': {
        default: DummySalesComponent,
      },
      './components/SalesChart.schema.ts': {
        intent: defineIntent({
          description: 'Sales chart from companion schema',
          schema: z.object({
            period: z.string(),
          }),
        }),
      },
    };

    const components = autoDiscoverComponents(mockGlob);

    expect(components.SalesChart).toBeDefined();
    expect(components.SalesChart.component).toBe(DummySalesComponent);
    expect(components.SalesChart.description).toBe('Sales chart from companion schema');
  });

  it('should support separate named exports schema and description', () => {
    const mockGlob = {
      './components/MetricCard.vue': {
        default: DummySalesComponent,
        description: 'Metric KPI card',
        schema: z.object({
          value: z.number(),
        }),
      },
    };

    const components = autoDiscoverComponents(mockGlob);

    expect(components.MetricCard).toBeDefined();
    expect(components.MetricCard.description).toBe('Metric KPI card');
  });

  it('should respect explicit custom name inside intent definition', () => {
    const mockGlob = {
      './components/v2/chart_impl.vue': {
        default: DummySalesComponent,
        intent: defineIntent({
          name: 'CustomSalesChart',
          description: 'Custom named chart',
          schema: z.object({ id: z.string() }),
        }),
      },
    };

    const components = autoDiscoverComponents(mockGlob);

    expect(components.CustomSalesChart).toBeDefined();
    expect(components.CustomSalesChart.description).toBe('Custom named chart');
  });

  it('should support custom nameTransform option', () => {
    const mockGlob = {
      './components/SalesChart.vue': {
        default: DummySalesComponent,
        intent: defineIntent({
          description: 'Sales chart',
          schema: z.object({ total: z.number() }),
        }),
      },
    };

    const components = autoDiscoverComponents(mockGlob, {
      nameTransform: (_path, name) => `Prefix_${name}`,
    });

    expect(components.Prefix_SalesChart).toBeDefined();
  });

  it('should skip components without schema when requireIntent is true', () => {
    const mockGlob = {
      './components/RegularButton.vue': {
        default: DummySalesComponent,
        // No schema or intent
      },
      './components/SalesChart.vue': {
        default: DummySalesComponent,
        intent: defineIntent({
          description: 'Sales chart',
          schema: z.object({ total: z.number() }),
        }),
      },
    };

    const components = autoDiscoverComponents(mockGlob, { requireIntent: true });

    expect(Object.keys(components)).toEqual(['SalesChart']);
    expect(components.RegularButton).toBeUndefined();
  });

  it('should integrate seamlessly with createIntentUI and getToolsDefinition', () => {
    const mockGlob = {
      './components/SalesChart.vue': {
        default: DummySalesComponent,
        intent: defineIntent({
          description: 'Sales chart tool',
          schema: z.object({
            total: z.number().describe('Total sales in EUR'),
          }),
        }),
      },
    };

    const intentUI = createIntentUI({
      components: autoDiscoverComponents(mockGlob),
    });

    const tools = intentUI.getToolsDefinition();
    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe('render_sales_chart');
    expect(tools[0].function.description).toBe('Sales chart tool');
    expect(tools[0].function.parameters).toHaveProperty('properties');
  });
});
