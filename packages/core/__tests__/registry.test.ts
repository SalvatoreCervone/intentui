import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createRegistry } from '../src/registry';

// Mock components (opaque to core)
const MockSalesChart = { name: 'SalesChart' };
const MockBookingCard = { name: 'BookingCard' };
const MockFallback = { name: 'Fallback' };

const salesChartSchema = z.object({
  title: z.string(),
  timeframe: z.enum(['daily', 'weekly', 'monthly']),
  metrics: z.array(z.object({ label: z.string(), value: z.number() })),
});

const bookingCardSchema = z.object({
  bookingId: z.string(),
  hotelName: z.string(),
  price: z.number(),
});

function createTestRegistry(withFallback = false) {
  return createRegistry({
    components: {
      SalesChart: {
        component: MockSalesChart,
        description: 'Displays a sales chart with time filters',
        schema: salesChartSchema,
      },
      BookingCard: {
        component: MockBookingCard,
        description: 'Booking confirmation card',
        schema: bookingCardSchema,
      },
    },
    fallback: withFallback ? MockFallback : undefined,
  });
}

describe('createRegistry', () => {
  describe('has()', () => {
    it('should return true for registered components', () => {
      const registry = createTestRegistry();
      expect(registry.has('SalesChart')).toBe(true);
      expect(registry.has('BookingCard')).toBe(true);
    });

    it('should return false for unregistered components', () => {
      const registry = createTestRegistry();
      expect(registry.has('UnknownComponent')).toBe(false);
    });
  });

  describe('list()', () => {
    it('should return all registered component names', () => {
      const registry = createTestRegistry();
      const names = registry.list();
      expect(names).toContain('SalesChart');
      expect(names).toContain('BookingCard');
      expect(names).toHaveLength(2);
    });
  });

  describe('resolve()', () => {
    it('should resolve a valid component with valid props', () => {
      const registry = createTestRegistry();
      const resolved = registry.resolve('SalesChart', {
        title: 'Q1 Sales',
        timeframe: 'monthly',
        metrics: [{ label: 'Revenue', value: 50000 }],
      });

      expect(resolved.isValid).toBe(true);
      expect(resolved.name).toBe('SalesChart');
      expect(resolved.component).toBe(MockSalesChart);
      expect(resolved.props).toEqual({
        title: 'Q1 Sales',
        timeframe: 'monthly',
        metrics: [{ label: 'Revenue', value: 50000 }],
      });
      expect(resolved.errors).toBeUndefined();
    });

    it('should return isValid=false with errors for invalid props', () => {
      const registry = createTestRegistry();
      const resolved = registry.resolve('SalesChart', {
        title: 123, // wrong type
        timeframe: 'yearly', // not in enum
      });

      expect(resolved.isValid).toBe(false);
      expect(resolved.errors).toBeDefined();
      expect(resolved.errors!.length).toBeGreaterThan(0);
    });

    it('should return isValid=false for unregistered components', () => {
      const registry = createTestRegistry();
      const resolved = registry.resolve('Unknown', { foo: 'bar' });

      expect(resolved.isValid).toBe(false);
      expect(resolved.errors).toContain('Component "Unknown" is not registered');
      expect(resolved.component).toBeNull();
    });

    it('should use fallback component for unregistered names when fallback is set', () => {
      const registry = createTestRegistry(true);
      const resolved = registry.resolve('Unknown', { foo: 'bar' });

      expect(resolved.isValid).toBe(false);
      expect(resolved.component).toBe(MockFallback);
    });

    it('should use fallback component on validation failure when fallback is set', () => {
      const registry = createTestRegistry(true);
      const resolved = registry.resolve('SalesChart', {
        title: 123, // invalid
      });

      expect(resolved.isValid).toBe(false);
      expect(resolved.component).toBe(MockFallback);
    });
  });

  describe('getToolsDefinition()', () => {
    it('should generate tool definitions for all registered components', () => {
      const registry = createTestRegistry();
      const tools = registry.getToolsDefinition();

      expect(tools).toHaveLength(2);

      // Check structure
      for (const tool of tools) {
        expect(tool.type).toBe('function');
        expect(tool.function).toBeDefined();
        expect(tool.function.name).toBeDefined();
        expect(tool.function.description).toBeDefined();
        expect(tool.function.parameters).toBeDefined();
      }
    });

    it('should convert PascalCase component names to snake_case tool names', () => {
      const registry = createTestRegistry();
      const tools = registry.getToolsDefinition();
      const toolNames = tools.map((t) => t.function.name);

      expect(toolNames).toContain('render_sales_chart');
      expect(toolNames).toContain('render_booking_card');
    });

    it('should include component descriptions', () => {
      const registry = createTestRegistry();
      const tools = registry.getToolsDefinition();
      const salesTool = tools.find(
        (t) => t.function.name === 'render_sales_chart'
      );

      expect(salesTool?.function.description).toBe(
        'Displays a sales chart with time filters'
      );
    });

    it('should generate valid JSON Schema parameters', () => {
      const registry = createTestRegistry();
      const tools = registry.getToolsDefinition();
      const salesTool = tools.find(
        (t) => t.function.name === 'render_sales_chart'
      );

      const params = salesTool?.function.parameters as Record<string, unknown>;
      expect(params).toBeDefined();
      expect(params.type).toBe('object');
      expect(params.properties).toBeDefined();
    });
  });

  describe('getFallback()', () => {
    it('should return the fallback when set', () => {
      const registry = createTestRegistry(true);
      expect(registry.getFallback()).toBe(MockFallback);
    });

    it('should return undefined when no fallback is set', () => {
      const registry = createTestRegistry(false);
      expect(registry.getFallback()).toBeUndefined();
    });
  });
});
