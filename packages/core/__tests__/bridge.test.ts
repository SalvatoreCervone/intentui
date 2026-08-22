import { describe, it, expect, vi } from 'vitest';
import { createActionBridge } from '../src/bridge';

describe('createActionBridge', () => {
  it('should emit actions and track them in history', () => {
    const bridge = createActionBridge();

    bridge.emit('SalesChart', 'select', { period: 'Q2' });
    bridge.emit('BookingCard', 'submit', { confirmed: true });

    const history = bridge.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0]!.componentName).toBe('SalesChart');
    expect(history[0]!.event).toBe('select');
    expect(history[0]!.data).toEqual({ period: 'Q2' });
    expect(history[1]!.componentName).toBe('BookingCard');
    expect(history[1]!.event).toBe('submit');
  });

  it('should include timestamps on emitted actions', () => {
    const bridge = createActionBridge();
    const before = Date.now();

    bridge.emit('SalesChart', 'click', null);

    const history = bridge.getHistory();
    expect(history[0]!.timestamp).toBeGreaterThanOrEqual(before);
    expect(history[0]!.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should call the onAction callback when an action is emitted', () => {
    const onAction = vi.fn();
    const bridge = createActionBridge({ onAction });

    bridge.emit('SalesChart', 'select', { period: 'Q2' });

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        componentName: 'SalesChart',
        event: 'select',
        data: { period: 'Q2' },
      })
    );
  });

  it('should handle async onAction callbacks without blocking', async () => {
    let resolved = false;
    const onAction = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      resolved = true;
    });

    const bridge = createActionBridge({ onAction });

    // emit should return immediately (not await the async callback)
    bridge.emit('SalesChart', 'click', null);
    expect(onAction).toHaveBeenCalledTimes(1);

    // Wait for the async callback to complete
    await new Promise((r) => setTimeout(r, 50));
    expect(resolved).toBe(true);
  });

  it('should clear history', () => {
    const bridge = createActionBridge();

    bridge.emit('A', 'click', null);
    bridge.emit('B', 'click', null);
    expect(bridge.getHistory()).toHaveLength(2);

    bridge.clearHistory();
    expect(bridge.getHistory()).toHaveLength(0);
  });

  it('should return a copy of history (not a mutable reference)', () => {
    const bridge = createActionBridge();

    bridge.emit('A', 'click', null);
    const history1 = bridge.getHistory();

    bridge.emit('B', 'click', null);
    const history2 = bridge.getHistory();

    // history1 should NOT have been mutated
    expect(history1).toHaveLength(1);
    expect(history2).toHaveLength(2);
  });

  it('should work without an onAction callback', () => {
    const bridge = createActionBridge();

    // Should not throw
    expect(() => bridge.emit('A', 'click', null)).not.toThrow();
    expect(bridge.getHistory()).toHaveLength(1);
  });

  it('should emit state diffs and track them in state history', () => {
    const onStateDiff = vi.fn();
    const bridge = createActionBridge({ onStateDiff });

    const diff = bridge.emitStateDiff('FormWizard', { step: 2 }, { step: 1 });

    expect(diff.componentName).toBe('FormWizard');
    expect(diff.diff).toEqual({ step: 2 });
    expect(diff.previous).toEqual({ step: 1 });

    expect(onStateDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        componentName: 'FormWizard',
        diff: { step: 2 },
      })
    );

    expect(bridge.getStateHistory()).toHaveLength(1);
  });

  it('should support dynamic listener subscriptions and unsubscriptions', () => {
    const bridge = createActionBridge();
    const actionListener = vi.fn();
    const stateListener = vi.fn();

    const unsubAction = bridge.subscribeAction(actionListener);
    const unsubState = bridge.subscribeStateDiff(stateListener);

    bridge.emit('MetricCard', 'refresh', { id: 123 });
    bridge.emitStateDiff('MetricCard', { value: 100 });

    expect(actionListener).toHaveBeenCalledTimes(1);
    expect(stateListener).toHaveBeenCalledTimes(1);

    unsubAction();
    unsubState();

    bridge.emit('MetricCard', 'refresh', { id: 456 });
    bridge.emitStateDiff('MetricCard', { value: 200 });

    // Should not have received additional calls after unsubscription
    expect(actionListener).toHaveBeenCalledTimes(1);
    expect(stateListener).toHaveBeenCalledTimes(1);
  });
});

