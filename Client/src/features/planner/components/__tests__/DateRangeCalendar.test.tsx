import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DateRangeCalendar from '../DateRangeCalendar';

describe('DateRangeCalendar', () => {
  it('exposes day cells as keyboard-focusable buttons with a full-date aria-label', () => {
    render(<DateRangeCalendar onChange={vi.fn()} onClose={vi.fn()} />);
    const cells = screen.getAllByRole('button', { name: /\d{4}/ });
    expect(cells.length).toBeGreaterThan(20);
    expect(cells[0]).toHaveAttribute('tabIndex', '0');
  });

  it('selects a range via keyboard alone (Enter on start day, Enter on end day)', () => {
    const onChange = vi.fn();
    render(<DateRangeCalendar initialStart="2026-09-10" initialEnd="2026-09-10" onChange={onChange} onClose={vi.fn()} />);

    const day15 = screen.getByRole('button', { name: /September 15, 2026/ });
    const day20 = screen.getByRole('button', { name: /September 20, 2026/ });

    fireEvent.keyDown(day15, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled(); // first key press only sets a tentative start

    fireEvent.keyDown(day20, { key: ' ' });
    expect(onChange).toHaveBeenCalledWith('2026-09-15', '2026-09-20');
  });

  it('marks the selected range with aria-pressed', () => {
    render(<DateRangeCalendar initialStart="2026-09-10" initialEnd="2026-09-12" onChange={vi.fn()} onClose={vi.fn()} />);
    const day11 = screen.getByRole('button', { name: /September 11, 2026/ });
    expect(day11).toHaveAttribute('aria-pressed', 'true');
  });

  it('still supports the existing mouse drag-select gesture (regression guard)', () => {
    const onChange = vi.fn();
    render(<DateRangeCalendar initialStart="2026-09-01" initialEnd="2026-09-01" onChange={onChange} onClose={vi.fn()} />);

    const day5 = screen.getByRole('button', { name: /September 5, 2026/ });
    const day8 = screen.getByRole('button', { name: /September 8, 2026/ });
    const grid = day5.closest('.grid')!;

    fireEvent.mouseDown(day5);
    fireEvent.mouseEnter(day8);
    fireEvent.mouseUp(grid);

    expect(onChange).toHaveBeenCalledWith('2026-09-05', '2026-09-08');
  });

  it('labels the month-navigation buttons for screen readers', () => {
    render(<DateRangeCalendar onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
  });
});
