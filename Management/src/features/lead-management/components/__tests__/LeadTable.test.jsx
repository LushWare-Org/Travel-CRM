import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadTable from '../LeadTable';
import { LIFECYCLE_STATUS_COLORS, LIFECYCLE_STATUS_LABELS } from '../LeadStatusBadge';

const pendingLead = {
  _id: 'p-1',
  id: 'p-1',
  name: 'Chat Lead',
  lifecycleStatus: 'PENDING_VERIFICATION',
  phone: '123456',
  email: 'chat@example.com',
};
const newLead = {
  _id: 'n-1',
  id: 'n-1',
  name: 'New Lead',
  lifecycleStatus: 'NEW',
  phone: '654321',
  email: 'new@example.com',
};

function renderTable(props = {}) {
  const onClaimClick = vi.fn();
  const utils = render(
    <LeadTable
      leads={[pendingLead, newLead]}
      loading={false}
      error={null}
      statusColors={LIFECYCLE_STATUS_COLORS}
      statusLabels={LIFECYCLE_STATUS_LABELS}
      onLeadClick={vi.fn()}
      onRemarksClick={vi.fn()}
      onClaimClick={onClaimClick}
      currentPage={1}
      totalPages={1}
      onPageChange={vi.fn()}
      leadsPerPage={12}
      totalLeads={2}
      {...props}
    />
  );
  return { onClaimClick, ...utils };
}

describe('LeadTable — PENDING_VERIFICATION claim action', () => {
  it('shows the Claim action only for PENDING_VERIFICATION rows in table view', () => {
    renderTable({ viewMode: 'table' });

    const claimButtons = screen.getAllByRole('button', { name: /claim/i });
    expect(claimButtons).toHaveLength(1);

    // The Claim button sits in the PENDING_VERIFICATION row, not the NEW row.
    const pendingRow = screen.getByText('Chat Lead').closest('tr');
    expect(within(pendingRow).getByRole('button', { name: /claim/i })).toBeInTheDocument();

    const newRow = screen.getByText('New Lead').closest('tr');
    expect(within(newRow).queryByRole('button', { name: /claim/i })).not.toBeInTheDocument();
  });

  it('calls onClaimClick with the lead when the Claim action is clicked', async () => {
    const user = userEvent.setup();
    const { onClaimClick } = renderTable({ viewMode: 'table' });

    const claimButton = screen.getByRole('button', { name: /claim/i });
    await user.click(claimButton);

    expect(onClaimClick).toHaveBeenCalledTimes(1);
    expect(onClaimClick).toHaveBeenCalledWith(pendingLead);
  });

  it('renders the Pending Verification badge label for a PENDING_VERIFICATION row', () => {
    renderTable({ viewMode: 'table' });
    // The status badge label is source of truth from LIFECYCLE_STATUS_LABELS.
    expect(screen.getAllByText('Pending Verification').length).toBeGreaterThan(0);
  });

  it('shows the Claim action only for PENDING_VERIFICATION cards in grid view', () => {
    renderTable({ viewMode: 'grid' });

    const claimButtons = screen.getAllByRole('button', { name: /claim/i });
    expect(claimButtons).toHaveLength(1);
  });
});
