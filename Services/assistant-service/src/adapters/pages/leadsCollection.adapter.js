import { z } from 'zod';
import { createPageAdapter } from '../collectionEngine.js';

const PAGE_LIMIT = 200;

export const leadsCollectionAdapter = createPageAdapter({
  key: 'leads',
  scopeSchema: z.object({}).strict(),
  scopeLabel: () => 'Leads',
  // The collection scope knows about lists, not about one lead, so `getLead` is
  // deliberately absent here — it would invite a fetch for a row the operator
  // never selected.
  tools: ['listLeads'],
  sources: [
    {
      name: 'leads',
      envKey: 'LEAD_SERVICE_URL',
      path: `/api/v1/leads?limit=${PAGE_LIMIT}&page=1&sortBy=updatedAt&order=asc`,
      listPath: 'data',
      recordKind: 'lead',
      idField: 'id',
      fields: [
        'id',
        'name',
        'lifecycleStatus',
        'assignedToId',
        'destination',
        'source',
        'platform',
        'budget',
        'createdAt',
        'updatedAt',
      ],
      label: 'Leads',
      paging: { param: 'limit', defaultLimit: PAGE_LIMIT, totalPath: 'pagination.total' },
    },
  ],
  rules: [
    {
      source: 'leads',
      rule: 'unassigned',
      field: 'assignedToId',
      section: 'attention',
      severity: 'warning',
      text: 'Lead has no owner.',
    },
    {
      source: 'leads',
      rule: 'stuckInStatus',
      statusField: 'lifecycleStatus',
      statuses: ['PENDING_VERIFICATION', 'NEW'],
      dateField: 'updatedAt',
      days: 2,
      section: 'attention',
      severity: 'warning',
      text: 'New lead has been unedited for more than two days.',
    },
    {
      source: 'leads',
      rule: 'staleForDays',
      field: 'updatedAt',
      days: 7,
      section: 'attention',
      severity: 'warning',
      text: 'Open lead has not been updated for at least a week.',
    },
    {
      source: 'leads',
      rule: 'groupedCount',
      byKey: 'destination',
      threshold: 3,
      section: 'experienced_view',
      severity: 'info',
      text: '{count} leads are asking for the same destination: {byKey}.',
    },
    {
      source: 'leads',
      rule: 'groupedCount',
      byKey: 'source',
      threshold: 5,
      section: 'changed',
      severity: 'info',
      text: '{count} leads in this view came from {byKey}.',
    },
  ],
  questionTemplates: [
    'Which leads need attention first?',
    'Where is demand clustering?',
    'Which leads have gone quiet?',
  ],
});
