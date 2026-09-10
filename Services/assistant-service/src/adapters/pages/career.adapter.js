import { z } from 'zod';
import { createPageAdapter } from '../collectionEngine.js';

const PAGE_LIMIT = 200;
const DAY_MS = 86_400_000;

export const careerAdapter = createPageAdapter({
  key: 'career',
  scopeSchema: z.object({}).strict(),
  scopeLabel: () => 'Career',
  sources: [
    {
      name: 'career-stats',
      shape: 'singleton',
      envKey: 'CAREER_SERVICE_URL',
      path: '/api/v1/careers/stats',
      listPath: 'data',
      recordKind: 'career-stats',
      fields: ['id', 'total'],
      transform: (data) => ({ id: 'career-stats', total: data.total }),
      label: 'Application totals',
    },
    {
      name: 'vacancies',
      envKey: 'CAREER_SERVICE_URL',
      path: '/api/v1/vacancies/admin/all',
      listPath: 'data',
      recordKind: 'vacancy',
      idField: 'id',
      fields: [
        'id',
        'position',
        'status',
        'location',
        'type',
        'experienceMin',
        'applicationsCount',
        'closingDate',
        'createdAt',
        'updatedAt',
      ],
      label: 'Vacancies',
      // No pagination declared: this endpoint returns the full list with no
      // total to compare against, so the engine cannot prove completeness if
      // it ever does page. A row-cap breach marks the source unavailable.
    },
    {
      name: 'applications',
      envKey: 'CAREER_SERVICE_URL',
      path: `/api/v1/careers/submissions?limit=${PAGE_LIMIT}&page=1`,
      listPath: 'data.applications',
      recordKind: 'application',
      idField: 'id',
      fields: ['id', 'fullName', 'position', 'status', 'createdAt', 'updatedAt'],
      label: 'Applications',
      paging: { param: 'limit', defaultLimit: PAGE_LIMIT, totalPath: 'data.pagination.total' },
    },
  ],
  rules: [
    {
      source: 'vacancies',
      rule: 'stuckInStatus',
      statusField: 'status',
      statuses: ['draft'],
      dateField: 'createdAt',
      days: 30,
      section: 'attention',
      severity: 'info',
      text: 'Draft vacancy has been sitting unpublished for at least a month.',
    },
    {
      source: 'vacancies',
      rule: 'missingField',
      field: 'location',
      section: 'attention',
      severity: 'warning',
      text: 'Vacancy is missing its location.',
    },
    {
      run(bundle) {
        const now = Date.now();
        const insights = [];
        for (const vacancy of bundle.records) {
          if (vacancy.__source !== 'vacancies') continue;
          if (vacancy.status !== 'active') continue;
          const closing = vacancy.closingDate ? new Date(vacancy.closingDate).getTime() : NaN;
          if (Number.isNaN(closing) || closing < now || closing - now > 14 * DAY_MS) continue;
          const evidenceId = bundle.index?.[vacancy.id]?.closingDate;
          if (!evidenceId) continue;
          insights.push({
            id: `vacancy-closing:${vacancy.id}`,
            section: 'attention',
            severity: 'warning',
            text: 'Open vacancy closes within two weeks.',
            fact: { kind: 'date', value: new Date(closing).toISOString(), evidenceId },
            evidenceIds: [evidenceId],
          });
        }
        return insights;
      },
    },
    {
      run(bundle) {
        // A vacancy with no applications and a live posting is a signal the
        // posting is not reaching anyone, which no single-field predicate sees.
        const insights = [];
        for (const vacancy of bundle.records) {
          if (vacancy.__source !== 'vacancies' || vacancy.status !== 'active') continue;
          if (typeof vacancy.applicationsCount !== 'number' || vacancy.applicationsCount > 0) continue;
          const evidenceId = bundle.index?.[vacancy.id]?.applicationsCount;
          if (!evidenceId) continue;
          insights.push({
            id: `vacancy-unfilled:${vacancy.id}`,
            section: 'experienced_view',
            severity: 'info',
            text: 'Active vacancy has received no applications.',
            evidenceIds: [evidenceId],
          });
        }
        return insights;
      },
    },
  ],
  questionTemplates: [
    'Which vacancies need attention?',
    'Where is the hiring pipeline stuck?',
    'What closes soonest?',
  ],
});
