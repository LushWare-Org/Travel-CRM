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
  // Claim now lives in each row's overflow menu. That menu is portalled out of
  // the row, so a row's own menu has to be opened before its items can be found.
  const openRowMenu = async (user, leadName) => {
    const row = screen.getByText(leadName).closest('tr');
    await user.click(within(row).getByRole('button', { name: /more actions/i }));
  };

  it('offers the Claim action in the overflow menu of a PENDING_VERIFICATION row', async () => {
    const user = userEvent.setup();
    renderTable({ viewMode: 'table' });

    await openRowMenu(user, 'Chat Lead');

    expect(screen.getByRole('button', { name: /claim lead/i })).toBeInTheDocument();
  });

  it('does not offer the Claim action on a row that is not awaiting verification', async () => {
    const user = userEvent.setup();
    renderTable({ viewMode: 'table' });

    await openRowMenu(user, 'New Lead');

    expect(screen.queryByRole('button', { name: /claim lead/i })).not.toBeInTheDocument();
  });

  it('calls onClaimClick with the lead when the Claim action is clicked', async () => {
    const user = userEvent.setup();
    const { onClaimClick } = renderTable({ viewMode: 'table' });

    await openRowMenu(user, 'Chat Lead');
    await user.click(screen.getByRole('button', { name: /claim lead/i }));

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

const assignedLead = {
  _id: 'a-1',
  id: 'a-1',
  name: 'Assigned Lead',
  lifecycleStatus: 'NEW',
  assignedToId: 'rep-7',
};
const unassignedLead = {
  _id: 'u-1',
  id: 'u-1',
  name: 'Unassigned Lead',
  lifecycleStatus: 'NEW',
  assignedToId: null,
};
const salesReps = [{ id: 'rep-7', name: 'Rita Rep' }];

function renderAssignmentTable(props = {}) {
  const onAssign = vi.fn();
  const utils = render(
    <LeadTable
      leads={[assignedLead, unassignedLead]}
      loading={false}
      error={null}
      statusColors={LIFECYCLE_STATUS_COLORS}
      statusLabels={LIFECYCLE_STATUS_LABELS}
      onLeadClick={vi.fn()}
      onRemarksClick={vi.fn()}
      currentPage={1}
      totalPages={1}
      onPageChange={vi.fn()}
      leadsPerPage={12}
      totalLeads={2}
      viewMode="table"
      salesReps={salesReps}
      onAssign={onAssign}
      {...props}
    />
  );
  return { onAssign, ...utils };
}

describe('LeadTable — Sales Rep column', () => {
  it('renders the Sales Rep column immediately after ID', () => {
    renderAssignmentTable();

    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent.trim());
    expect(headers[0]).toBe('ID');
    expect(headers[1]).toBe('Sales Rep');
  });

  it('shows the assignee name resolved from assignedToId rather than N/A', () => {
    renderAssignmentTable();

    const row = screen.getByText('Assigned Lead').closest('tr');
    // The Sales Rep cell specifically — every other empty cell in this row
    // legitimately renders N/A.
    expect(row.querySelectorAll('td')[1].textContent).toBe('Rita Rep');
  });

  it('shows plain text for an assigned lead when the operator cannot change the assignment', () => {
    renderAssignmentTable({ canChangeAssignment: false });

    const row = screen.getByText('Assigned Lead').closest('tr');
    expect(within(row).getByText('Rita Rep')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /change assignee/i })).not.toBeInTheDocument();
  });

  it('offers the change control on an assigned lead for an admin', async () => {
    const user = userEvent.setup();
    renderAssignmentTable({ canChangeAssignment: true });

    const row = screen.getByText('Assigned Lead').closest('tr');
    await user.click(within(row).getByRole('button', { name: /change assignee/i }));

    expect(screen.getByRole('button', { name: 'Rita Rep' })).toBeInTheDocument();
  });

  it('offers the assign control on an unassigned lead even for a non-admin', () => {
    renderAssignmentTable({ canChangeAssignment: false });

    const row = screen.getByText('Unassigned Lead').closest('tr');
    expect(within(row).getByRole('button', { name: /assign this lead/i })).toBeInTheDocument();
  });

  it('calls onAssign with the lead id and the chosen rep id', async () => {
    const user = userEvent.setup();
    const { onAssign } = renderAssignmentTable();

    const row = screen.getByText('Unassigned Lead').closest('tr');
    await user.click(within(row).getByRole('button', { name: /assign this lead/i }));
    await user.click(screen.getByRole('button', { name: 'Rita Rep' }));

    expect(onAssign).toHaveBeenCalledWith('u-1', 'rep-7');
  });

  it('falls back to the assignee id rather than claiming Unassigned when the rep is not in the active list', () => {
    renderAssignmentTable({ salesReps: [{ id: 'rep-other', name: 'Someone Else' }] });

    const row = screen.getByText('Assigned Lead').closest('tr');
    expect(within(row).getByText('rep-7')).toBeInTheDocument();
    expect(within(row).queryByText('Unassigned')).not.toBeInTheDocument();
  });

  it('names the owner on the grid card too, so only the genuinely unassigned lead reads Unassigned', () => {
    renderAssignmentTable({ viewMode: 'grid' });

    // Before the owner was resolved from assignedToId, both cards read
    // Unassigned because the field they read does not exist.
    expect(screen.getAllByText('Unassigned')).toHaveLength(1);
    expect(screen.getByText('Rita Rep')).toBeInTheDocument();
  });
});
