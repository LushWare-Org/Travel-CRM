import { z } from 'zod';
import { createPageAdapter } from '../collectionEngine.js';

const PAGE_LIMIT = 200;

export const usersAdapter = createPageAdapter({
  key: 'users',
  scopeSchema: z.object({}).strict(),
  scopeLabel: () => 'Users',
  sources: [
    {
      name: 'rep-stats',
      shape: 'singleton',
      envKey: 'USER_SERVICE_URL',
      path: '/api/v1/sales-reps/stats',
      listPath: 'data',
      recordKind: 'user-stats',
      fields: ['id', 'total', 'active', 'inactive'],
      transform: (data) => ({ id: 'rep-stats', ...data }),
      label: 'Sales rep totals',
    },
    {
      name: 'sales-reps',
      envKey: 'USER_SERVICE_URL',
      path: `/api/v1/sales-reps?limit=${PAGE_LIMIT}&page=1`,
      listPath: 'data',
      recordKind: 'sales-rep',
      idField: 'id',
      fields: ['id', 'name', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
      label: 'Sales reps',
      paging: { param: 'limit', defaultLimit: PAGE_LIMIT, totalPath: 'pagination.total' },
    },
  ],
  rules: [
    {
      source: 'rep-stats',
      rule: 'ratioBelow',
      numeratorField: 'active',
      denominatorField: 'total',
      threshold: 0.8,
      section: 'attention',
      severity: 'warning',
      text: 'More than one in five sales rep accounts is inactive.',
    },
    {
      source: 'sales-reps',
      rule: 'missingField',
      field: 'email',
      section: 'attention',
      severity: 'warning',
      text: 'Staff account is missing an email address.',
    },
    {
      run(bundle) {
        const insights = [];
        const DAY_MS = 86_400_000;
        for (const rep of bundle.records) {
          if (rep.__source !== 'sales-reps') continue;
          if (rep.isActive !== false) continue;
          const updated = rep.updatedAt ? new Date(rep.updatedAt).getTime() : NaN;
          if (Number.isNaN(updated) || Date.now() - updated < 30 * DAY_MS) continue;
          const evidenceId = bundle.index?.[rep.id]?.isActive;
          if (!evidenceId) continue;
          insights.push({
            id: `dormant-rep:${rep.id}`,
            section: 'attention',
            severity: 'info',
            text: 'Deactivated staff account has not been touched in over a month.',
            evidenceIds: [evidenceId],
          });
        }
        return insights;
      },
    },
  ],
  questionTemplates: [
    'Which accounts look dormant?',
    'What is wrong with the staff roster?',
    'Where are the access gaps?',
  ],
});
