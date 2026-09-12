import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LEAD_COPILOT_FIELDS, leadEvidenceId } from '@travel-crm/contracts';
// The page gates the copilot behind a build-time flag that only exists in a
// local .env, so set it before the page module is evaluated. Without this the
// copilot never mounts under CI and the scope assertions below read zero calls.
vi.hoisted(() => {
  vi.stubEnv('VITE_MANAGEMENT_COPILOT_ENABLED', 'true');
});

const {
  mockGetAllLeads, mockGetLeadStats, mockGetSalesReps, mockGetAssignmentSettings, mockGetStoredUser,
  mockDeterministic, mockInsights, mockAsk, mockSeen,
} = vi.hoisted(() => ({
  mockGetAllLeads: vi.fn(),
  mockGetLeadStats: vi.fn(),
  mockGetSalesReps: vi.fn(),
  mockGetAssignmentSettings: vi.fn(),
  mockGetStoredUser: vi.fn(),
  mockDeterministic: vi.fn(),
  mockInsights: vi.fn(),
  mockAsk: vi.fn(),
  mockSeen: vi.fn(),
}));

vi.mock('../../../../services/api', () => ({
  leadAPI: {
    getAllLeads: mockGetAllLeads,
    getLeadStats: mockGetLeadStats,
    getAssignmentSettings: mockGetAssignmentSettings,
  },
  adminAPI: { getSalesReps: mockGetSalesReps },
  authAPI: { getStoredUser: mockGetStoredUser },
}));

vi.mock('@/services/copilotAPI', () => ({
  copilotDeterministic: mockDeterministic,
  copilotInsights: mockInsights,
  copilotAsk: mockAsk,
  copilotSeen: mockSeen,
  isCopilotAbort: (err: unknown) => Boolean(err) && (err as { name?: string }).name === 'AbortError',
  COPILOT_CLIENT_TIMEOUT_MS: 20_000,
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useNavigate: () => vi.fn(),
}));

vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

// Page chrome unrelated to the detail pane / copilot scope coupling.
vi.mock('../../../../features/lead-management/components/LeadStats', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/LeadFilters', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/NewLeadDialog', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/RemarksDialog', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/WhatsAppHistoryDialog', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/FilterDialog', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/SettingsDialog', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/StatusChangeDialog', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/ActiveSalesRepsDialog', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/LeadSectionView', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/quotation/QuotationModal', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/InvoiceDialog', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/ReceiptDialog', () => ({ default: () => null }));
vi.mock('../../../../features/lead-management/components/VoucherDialog', () => ({ default: () => null }));

vi.mock('../../../../features/lead-management/components/EditLeadDialog', () => ({
  default: ({ isOpen, lead }: { isOpen: boolean; lead: { name?: string } | null }) =>
    isOpen ? <div data-testid="edit-lead-dialog">{lead?.name}</div> : null,
}));

import { AuthProvider } from '../../../../contexts/AuthContext';
import LeadManagement from '../../../../pages/LeadManagement';
import { setViewport } from '../../../copilot/__tests__/copilotTestUtils';

const lead = {
  _id: 'lead-a',
  name: 'Alice Traveller',
  lifecycleStatus: 'NEW',
  destination: 'Lisbon',
  budget: 2500,
  assignedToId: 'rep-1',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-09T00:00:00.000Z',
};

function renderPage() {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('user', JSON.stringify({ _id: 'actor-1', name: 'Ops' }));
  return render(
    <AuthProvider>
      <LeadManagement />
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setViewport({ desktop: true });

  mockGetAllLeads.mockResolvedValue({ success: true, data: [lead], pagination: { pages: 1, total: 1 } });
  mockGetLeadStats.mockResolvedValue({ success: true, summary: { total: 1 }, data: [] });
  mockGetSalesReps.mockResolvedValue({ success: true, data: [] });
  mockGetAssignmentSettings.mockResolvedValue({ success: true, data: {} });
  mockGetStoredUser.mockReturnValue({ role: 'admin' });

  mockDeterministic.mockImplementation(({ scope }: { scope: { leadId: string } }) =>
    Promise.resolve({
      context: { pageKey: 'leads', scopeLabel: `Lead ${scope.leadId}`, asOf: '2026-09-10T10:00:00.000Z', noAccess: false },
      insights: [
        {
          id: 'insight-1',
          section: 'current_state',
          severity: 'info',
          text: `Deterministic ${scope.leadId}`,
          evidenceIds: [leadEvidenceId(scope.leadId, 'destination')],
        },
      ],
      unavailableSources: [],
      notAuthorizedSources: [],
    })
  );
  mockInsights.mockImplementation(({ scope }: { scope: { leadId: string } }) =>
    Promise.resolve({
      context: { pageKey: 'leads', scopeLabel: `Lead ${scope.leadId}`, generatedAt: '2026-09-10T10:05:00.000Z', partial: false, noAccess: false },
      claims: [
        {
          id: 'claim-1',
          section: 'current_state',
          text: `Insights ${scope.leadId ?? 'collection'}`,
          facts: [],
          evidenceIds: [leadEvidenceId(scope.leadId, 'destination')],
          evidenceType: 'record',
          severity: 'info',
        },
      ],
      suggestedQuestions: ['Is the deposit paid?'],
      sources: [{ id: leadEvidenceId(scope.leadId, 'destination'), label: 'Destination', type: 'record' }],
      unavailableSources: [],
      notAuthorizedSources: [],
    })
  );
  mockSeen.mockResolvedValue({ ok: true });
  mockAsk.mockResolvedValue({ claims: [], answerBlocks: [], suggestedQuestions: [], sources: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('LeadDetailPane', () => {
  it('renders every allowlisted field with the evidence id the adapter cites', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByText('Alice Traveller');
    expect(mockDeterministic).toHaveBeenCalledTimes(1);

    await user.click(row);

    const pane = screen.getByRole('complementary', { name: 'Lead detail' });
    expect(LEAD_COPILOT_FIELDS).toHaveLength(8);
    for (const field of LEAD_COPILOT_FIELDS) {
      const target = pane.querySelector(`[data-copilot-evidence-id="${leadEvidenceId('lead-a', field)}"]`);
      expect(target, `missing anchor for ${field}`).not.toBeNull();
    }

    expect(pane).toHaveTextContent('Lisbon');
    expect(pane).toHaveTextContent('2,500');
  });

  it('binds the copilot scope to the row selected in the pane, not to the documents dialog', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByText('Alice Traveller');
    await user.click(row);

    await waitFor(() =>
      expect(mockDeterministic).toHaveBeenCalledWith(expect.objectContaining({ scope: { leadId: 'lead-a' } }))
    );

    // Row selection no longer auto-opens the editor.
    expect(screen.queryByTestId('edit-lead-dialog')).not.toBeInTheDocument();

    // The grounded insights renders in the persistent dock.
    await waitFor(() => expect(screen.getByText('Insights lead-a')).toBeInTheDocument());
  });

  it('clears selection into the no-lead state and issues no further request', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('Alice Traveller'));
    await waitFor(() => expect(mockDeterministic).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('Insights lead-a')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Close lead detail' }));

    expect(screen.getByText('Select a lead to see its details and evidence.')).toBeInTheDocument();
    expect(screen.queryByText('Insights lead-a')).not.toBeInTheDocument();
    expect(screen.queryByText('Deterministic lead-a')).not.toBeInTheDocument();
    // Deselecting does NOT go dormant any more: `{}` is the COLLECTION scope —
    // the general leads page. That is the whole point of the collection mode,
    // so a further request is expected and the record's claims must be gone.
    await waitFor(() =>
      expect(mockDeterministic).toHaveBeenCalledWith(expect.objectContaining({ scope: {} })),
    );
    await waitFor(() => expect(screen.getByText('Insights collection')).toBeInTheDocument());
    expect(screen.getByRole('complementary', { name: 'Lead detail' })).toHaveAttribute(
      'data-copilot-record',
      'empty'
    );
  });
});
