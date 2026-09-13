import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toolbar from '../Toolbar';

const commonProps = {
  showFilters: false,
  onToggleFilters: vi.fn(),
  activeFiltersCount: 0,
  onClearAllFilters: vi.fn(),
  sortBy: 'popularity' as const,
  onSortChange: vi.fn(),
};

describe('package toolbar accessibility', () => {
  it('names the view controls and reports the selected layout', async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();
    const { rerender } = render(
      <Toolbar {...commonProps} viewMode="grid" onViewModeChange={onViewModeChange} />,
    );

    const gridView = screen.getByRole('button', { name: 'Grid view' });
    const listView = screen.getByRole('button', { name: 'List view' });
    expect(gridView).toHaveAttribute('aria-pressed', 'true');
    expect(listView).toHaveAttribute('aria-pressed', 'false');

    await user.click(listView);
    expect(onViewModeChange).toHaveBeenCalledWith('list');

    rerender(<Toolbar {...commonProps} viewMode="list" onViewModeChange={onViewModeChange} />);
    expect(gridView).toHaveAttribute('aria-pressed', 'false');
    expect(listView).toHaveAttribute('aria-pressed', 'true');
  });
});
