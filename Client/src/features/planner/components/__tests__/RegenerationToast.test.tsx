import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import RegenerationToast from '../RegenerationToast';

describe('RegenerationToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the message and an Undo button with the correct accessibility attributes', () => {
    render(<RegenerationToast message="Day 3 regenerated" onUndo={vi.fn()} onDismiss={vi.fn()} />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Day 3 regenerated')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('clicking Undo calls onUndo', () => {
    const onUndo = vi.fn();
    render(<RegenerationToast message="Day 3 regenerated" onUndo={onUndo} onDismiss={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss automatically after 6 seconds', () => {
    const onDismiss = vi.fn();
    render(<RegenerationToast message="Day 3 regenerated" onUndo={vi.fn()} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(5999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('a parent re-render with a fresh inline onDismiss never restarts the dismiss timer', () => {
    // Regression test: both call sites pass `onDismiss={() => setRegenToast(null)}`,
    // a new closure every render. The effect must key off `message`, not
    // `onDismiss`, so a re-render mid-countdown doesn't push the deadline out.
    const onDismiss = vi.fn();
    const { rerender } = render(
      <RegenerationToast message="Day 3 regenerated" onUndo={vi.fn()} onDismiss={() => onDismiss('first')} />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // Re-render with a brand-new onDismiss closure, simulating an unrelated
    // parent state update (e.g. a keystroke elsewhere in the form).
    rerender(<RegenerationToast message="Day 3 regenerated" onUndo={vi.fn()} onDismiss={() => onDismiss('second')} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith('second');
  });

  it('a new toast (different message) restarts the dismiss timer', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<RegenerationToast message="Day 3 regenerated" onUndo={vi.fn()} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    rerender(<RegenerationToast message="Day 4 regenerated" onUndo={vi.fn()} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
