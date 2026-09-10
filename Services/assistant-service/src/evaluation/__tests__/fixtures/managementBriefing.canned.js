// Canned Management briefing fixtures for the content gate. Each row carries
// the lead-service payload the adapter fetches, the resolved acknowledgement
// boundary, and raw model output exactly as Gemini would return it (before
// canonicalization). No live model call is made — see
// ../managementBriefingEvaluation.js.

const CHANGED_LEAD = {
  id: 'lead-1',
  lifecycleStatus: 'NEW',
  assignedToId: 'rep-1',
  name: 'Jane',
  destination: 'Bali',
  budget: 450000,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-08T00:00:00Z',
  passwordHash: 'SHOULD-NOT-LEAK',
};

export const CANNED_MANAGEMENT_BRIEFINGS = [
  {
    id: 'substantive-briefing',
    description: 'Every claim either names the cited field value or carries a grounded typed fact.',
    boundary: '2026-09-05T00:00:00Z',
    lead: CHANGED_LEAD,
    claims: [
      {
        id: 'c-status',
        section: 'current_state',
        text: 'Lead is in NEW status.',
        facts: [],
        evidenceIds: ['lead:lead-1:lifecycleStatus'],
        evidenceType: 'record',
        severity: 'info',
      },
      {
        id: 'c-destination',
        section: 'current_state',
        text: 'Destination is Bali.',
        facts: [],
        evidenceIds: ['lead:lead-1:destination'],
        evidenceType: 'record',
        severity: 'info',
      },
      {
        id: 'c-budget',
        section: 'current_state',
        text: 'Budget is recorded for this lead.',
        facts: [{ kind: 'amount', value: '450000', evidenceId: 'lead:lead-1:budget' }],
        evidenceIds: ['lead:lead-1:budget'],
        evidenceType: 'record',
        severity: 'info',
      },
      {
        id: 'c-changed',
        section: 'changed',
        text: 'The record was updated within the active window.',
        facts: [{ kind: 'date', value: '2026-09-08T00:00:00Z', evidenceId: 'lead:lead-1:updatedAt' }],
        evidenceIds: ['lead:lead-1:updatedAt'],
        evidenceType: 'record',
        severity: 'info',
      },
    ],
    expectedFailures: [],
  },
  {
    id: 'grounded-but-empty',
    description: 'Valid field citations, but no claim says anything that follows from the cited field.',
    boundary: '2026-09-05T00:00:00Z',
    lead: CHANGED_LEAD,
    claims: [
      {
        id: 'c-empty-1',
        section: 'current_state',
        text: 'This lead has a status.',
        facts: [],
        evidenceIds: ['lead:lead-1:lifecycleStatus'],
        evidenceType: 'record',
        severity: 'info',
      },
      {
        id: 'c-empty-2',
        section: 'attention',
        text: 'There is a budget consideration.',
        facts: [],
        evidenceIds: ['lead:lead-1:budget'],
        evidenceType: 'record',
        severity: 'warning',
      },
    ],
    expectedFailures: ['c-empty-1:empty-claim', 'c-empty-2:empty-claim'],
  },
  {
    id: 'changed-outside-window',
    description: 'A grounded change claim whose cited record update predates the acknowledgement boundary.',
    boundary: '2026-09-09T00:00:00Z',
    lead: CHANGED_LEAD,
    claims: [
      {
        id: 'c-stale-change',
        section: 'changed',
        text: 'The record changed since you last saw it.',
        facts: [{ kind: 'date', value: '2026-09-08T00:00:00Z', evidenceId: 'lead:lead-1:updatedAt' }],
        evidenceIds: ['lead:lead-1:updatedAt'],
        evidenceType: 'record',
        severity: 'info',
      },
    ],
    expectedFailures: ['c-stale-change:changed-outside-window'],
  },
  {
    id: 'legacy-composite-evidence-id',
    description: 'The removed composite lead:<id> evidence ID can no longer ground anything.',
    boundary: '2026-09-05T00:00:00Z',
    lead: CHANGED_LEAD,
    claims: [
      {
        id: 'c-legacy',
        section: 'current_state',
        text: 'The lead was updated recently.',
        facts: [],
        evidenceIds: ['lead:lead-1'],
        evidenceType: 'record',
        severity: 'info',
      },
    ],
    expectedFailures: ['c-legacy:no-valid-evidence'],
  },
];
