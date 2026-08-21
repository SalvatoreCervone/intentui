import type { IntentStreamChunk } from '@intentui/core';

/**
 * Simulated LLM streaming responses for local development.
 * Sends JSON characters one-by-one with a configurable delay,
 * emulating real LLM token-by-token streaming.
 */

interface MockScenario {
  name: string;
  description: string;
  payload: Record<string, unknown>;
}

const scenarios: Record<string, MockScenario> = {
  salesChart: {
    name: 'Sales Chart',
    description: 'Monthly sales data',
    payload: {
      component: 'SalesChart',
      props: {
        title: 'Q1 2026 Revenue',
        timeframe: 'monthly',
        metrics: [
          { label: 'January', value: 45200 },
          { label: 'February', value: 52800 },
          { label: 'March', value: 61400 },
        ],
      },
    },
  },
  bookingCard: {
    name: 'Booking Card',
    description: 'Hotel booking confirmation',
    payload: {
      component: 'BookingCard',
      props: {
        bookingId: 'BK-2026-0842',
        hotelName: 'Grand Hotel Vesuvio',
        checkIn: '2026-09-15',
        checkOut: '2026-09-20',
        price: 1250,
        guests: 2,
      },
    },
  },
};

/**
 * Simulate streaming a JSON payload character-by-character.
 * Calls `onChunk` with progressive text snippets and `onDone` when complete.
 */
export function simulateStream(
  scenarioKey: string,
  onChunk: (chunk: IntentStreamChunk) => void,
  onDone: () => void,
  options: { delayMs?: number; chunkSize?: number } = {}
): { cancel: () => void } {
  const { delayMs = 20, chunkSize = 3 } = options;
  const scenario = scenarios[scenarioKey];

  if (!scenario) {
    onDone();
    return { cancel: () => {} };
  }

  const json = JSON.stringify(scenario.payload);
  let position = 0;
  let cancelled = false;

  function sendNextChunk() {
    if (cancelled || position >= json.length) {
      if (!cancelled) {
        // Send the final complete chunk
        onChunk({
          intent: {
            component: scenario.payload.component as string,
            props: scenario.payload.props as Record<string, unknown>,
          },
          done: true,
        });
        onDone();
      }
      return;
    }

    // Advance position
    const end = Math.min(position + chunkSize, json.length);
    const partialJson = json.slice(0, end);
    position = end;

    // Try to parse the partial JSON and emit a streaming chunk
    try {
      const { parse } = await_partial_json();
      const parsed = parse(partialJson);

      if (parsed && typeof parsed === 'object') {
        const p = parsed as Record<string, unknown>;
        onChunk({
          intent: {
            component: (p.component as string) ?? '',
            props: (p.props as Record<string, unknown>) ?? {},
          },
          done: false,
        });
      }
    } catch {
      // Partial parse failed — this is expected, skip this chunk
    }

    setTimeout(sendNextChunk, delayMs);
  }

  sendNextChunk();

  return {
    cancel: () => {
      cancelled = true;
    },
  };
}

/**
 * Lazy import of partial-json to keep the mock module simple.
 * In the actual implementation this is handled by the core parser.
 */
function await_partial_json() {
  // Simple inline partial JSON parser for the mock
  // In production, the core StreamParser handles this
  return {
    parse: (str: string): unknown => {
      try {
        return JSON.parse(str);
      } catch {
        // Try to fix common incomplete JSON patterns
        let fixed = str;

        // Count open/close braces and brackets
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/]/g) || []).length;

        // Remove trailing comma if present
        fixed = fixed.replace(/,\s*$/, '');

        // Remove incomplete string at the end (unmatched quote)
        const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          fixed += '"';
        }

        // Close open brackets and braces
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixed += ']';
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixed += '}';
        }

        try {
          return JSON.parse(fixed);
        } catch {
          return null;
        }
      }
    },
  };
}

/** Get all available scenario keys */
export function getScenarioKeys(): string[] {
  return Object.keys(scenarios);
}

/** Get scenario metadata */
export function getScenarioInfo(key: string): { name: string; description: string } | undefined {
  const s = scenarios[key];
  return s ? { name: s.name, description: s.description } : undefined;
}
