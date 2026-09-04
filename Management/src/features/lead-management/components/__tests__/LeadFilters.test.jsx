import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadFilters from '../LeadFilters';

function renderFilters(props = {}) {
  return render(
    <LeadFilters
      searchTerm=""
      setSearchTerm={vi.fn()}
      filterStatus="all"
      setFilterStatus={vi.fn()}
      statusCounts={{}}
      filterSources={[]}
      setFilterSources={vi.fn()}
      filterPlatforms={[]}
      setFilterPlatforms={vi.fn()}
      onAdvancedFilterClick={vi.fn()}
      {...props}
    />
  );
}

describe('LeadFilters — PENDING_VERIFICATION', () => {
  it('includes PENDING_VERIFICATION as a selectable status filter tab', async () => {
    const user = userEvent.setup();
    const setFilterStatus = vi.fn();
    renderFilters({ setFilterStatus });

    const tab = screen.getByRole('tab', { name: /pending verification/i });
    expect(tab).toBeInTheDocument();

    await user.click(tab);
    expect(setFilterStatus).toHaveBeenCalledWith('PENDING_VERIFICATION');
  });
});

describe('LeadFilters — source & platform controls', () => {
  it('toggles a source chip through setFilterSources', async () => {
    const user = userEvent.setup();
    const setFilterSources = vi.fn();
    renderFilters({ setFilterSources });

    await user.click(screen.getByRole('button', { name: 'Booking' }));
    expect(setFilterSources).toHaveBeenCalledWith(['booking']);
  });

  it('toggles a platform chip through setFilterPlatforms', async () => {
    const user = userEvent.setup();
    const setFilterPlatforms = vi.fn();
    renderFilters({ setFilterPlatforms });

    await user.click(screen.getByRole('button', { name: 'Social' }));
    expect(setFilterPlatforms).toHaveBeenCalledWith(['Social_Media']);
  });
});
