import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Clock } from 'lucide-react';
import RangeFilterGroup, { type RangeOption } from '../RangeFilterGroup';

// base-ui's Checkbox renders its interactive control as a <span role="checkbox">
// whose click handler re-dispatches a PointerEvent on the hidden native input
// (dispatchClickWithModifiers). jsdom 25 does not implement PointerEvent, so
// without this polyfill clicking the checkbox glyph itself throws — same
// spirit as the IntersectionObserver polyfill in src/test/setup.ts.
if (typeof window.PointerEvent === 'undefined') {
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: class PointerEvent extends MouseEvent {
      constructor(type: string, params?: PointerEventInit) {
        super(type, params);
      }
    },
  });
}

// Shape mirrors the duration options in
// features/packages/components/FiltersSidebar.tsx (and the price options in
// the destinations copy — structurally identical { label, min, max } rows).
const options: RangeOption[] = [
  { label: 'Short (1-4 days)', min: 1, max: 4 },
  { label: 'Medium (5-7 days)', min: 5, max: 7 },
  { label: 'Long (8+ days)', min: 8, max: Infinity },
];

describe('RangeFilterGroup', () => {
  it('renders the group heading and every option as a labeled checkbox row', () => {
    render(
      <RangeFilterGroup label="Trip Duration" options={options} selected={null} onChange={vi.fn()} />
    );

    expect(screen.getByText('Trip Duration')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(options.length);
    for (const option of options) {
      expect(screen.getByRole('checkbox', { name: option.label })).toBeInTheDocument();
    }
  });

  it('calls onChange with the clicked option when an unselected row is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RangeFilterGroup
        label="Trip Duration"
        options={options}
        selected={options[1]}
        onChange={onChange}
      />
    );

    // Click the row's text (not the checkbox itself) — the whole row is the
    // toggle target, matching the original label-wrapped pattern.
    await user.click(screen.getByText('Short (1-4 days)'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(options[0]);
  });

  it('calls onChange with null when the currently selected row is clicked again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RangeFilterGroup
        label="Trip Duration"
        options={options}
        selected={options[1]}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('checkbox', { name: 'Medium (5-7 days)' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('reflects the selected option on its checkbox and leaves the rest unchecked', () => {
    render(
      <RangeFilterGroup label="Trip Duration" options={options} selected={options[2]} onChange={vi.fn()} />
    );

    expect(screen.getByRole('checkbox', { name: 'Long (8+ days)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Short (1-4 days)' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Medium (5-7 days)' })).not.toBeChecked();
  });

  it('selects exclusively: choosing another option moves the checked state, never multi-selects', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <RangeFilterGroup label="Trip Duration" options={options} selected={options[0]} onChange={onChange} />
    );
    expect(screen.getByRole('checkbox', { name: 'Short (1-4 days)' })).toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: 'Long (8+ days)' }));
    expect(onChange).toHaveBeenCalledWith(options[2]);

    rerender(
      <RangeFilterGroup label="Trip Duration" options={options} selected={options[2]} onChange={onChange} />
    );

    expect(screen.getByRole('checkbox', { name: 'Long (8+ days)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Short (1-4 days)' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Medium (5-7 days)' })).not.toBeChecked();
  });

  it('renders the optional icon next to the heading only when provided', () => {
    const { container, rerender } = render(
      <RangeFilterGroup
        label="Trip Duration"
        icon={<Clock />}
        options={options}
        selected={null}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Trip Duration')).toBeInTheDocument();
    // No option is selected, so the only svg is the heading icon (unchecked
    // checkboxes render no indicator icon).
    expect(container.querySelector('svg')).toBeInTheDocument();

    rerender(
      <RangeFilterGroup label="Trip Duration" options={options} selected={null} onChange={vi.fn()} />
    );

    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
