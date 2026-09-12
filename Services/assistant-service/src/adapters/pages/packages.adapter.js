import { z } from 'zod';
import { createPageAdapter } from '../collectionEngine.js';

const PAGE_LIMIT = 200;

export const packagesAdapter = createPageAdapter({
  key: 'packages',
  scopeSchema: z.object({}).strict(),
  scopeLabel: () => 'Packages',
  sources: [
    {
      name: 'package-stats',
      shape: 'singleton',
      envKey: 'PACKAGE_SERVICE_URL',
      path: '/api/v1/packages/stats/all',
      listPath: 'data',
      recordKind: 'package-stats',
      fields: ['id', 'total', 'active', 'featured', 'avgRating'],
      transform: (data) => ({ id: 'package-stats', ...data }),
      label: 'Package totals',
    },
    {
      name: 'packages',
      envKey: 'PACKAGE_SERVICE_URL',
      path: `/api/v1/packages/protected/all?limit=${PAGE_LIMIT}&page=1&sort=createdAt&order=asc`,
      listPath: 'data',
      recordKind: 'package',
      idField: 'id',
      fields: [
        'id',
        'title',
        'description',
        'destination',
        'durationDays',
        'category',
        'basePrice',
        'sellPrice',
        'currency',
        'isActive',
        'isFeatured',
        'rating',
        'numReviews',
        'views',
        'bookings',
        'createdAt',
      ],
      label: 'Packages',
      paging: { param: 'limit', defaultLimit: PAGE_LIMIT, totalPath: 'total' },
    },
  ],
  rules: [
    {
      source: 'package-stats',
      rule: 'ratioBelow',
      numeratorField: 'active',
      denominatorField: 'total',
      threshold: 0.7,
      section: 'attention',
      severity: 'warning',
      text: 'Less than seventy percent of the package catalogue is active.',
    },
    {
      source: 'packages',
      rule: 'missingField',
      field: 'destination',
      section: 'attention',
      severity: 'warning',
      text: 'Package is missing its destination.',
    },
    {
      source: 'packages',
      rule: 'missingField',
      field: 'description',
      section: 'attention',
      severity: 'info',
      text: 'Package is missing its description.',
    },
    {
      source: 'packages',
      rule: 'stuckInStatus',
      statusField: 'isActive',
      statuses: [false],
      dateField: 'createdAt',
      days: 30,
      section: 'attention',
      severity: 'warning',
      text: 'Inactive package has remained unpublished for at least a month.',
    },
    {
      source: 'packages',
      rule: 'groupedCount',
      byKey: 'destination',
      threshold: 3,
      section: 'experienced_view',
      severity: 'info',
      text: '{count} packages target the same destination: {byKey}.',
    },
    {
      run(bundle) {
        const insights = [];
        for (const pkg of bundle.records) {
          if (pkg.__source !== 'packages') continue;
          if (!pkg.isActive || typeof pkg.views !== 'number' || pkg.views < 100) continue;
          if (typeof pkg.bookings !== 'number' || pkg.bookings > 0) continue;
          const evidenceId = bundle.index?.[pkg.id]?.views;
          if (!evidenceId) continue;
          insights.push({
            id: `viewed-not-booked:${pkg.id}`,
            entityRef: { kind: 'record', id: String(pkg.id) },
            section: 'attention',
            severity: 'warning',
            text: 'Active package is getting views but no bookings.',
            evidenceIds: [evidenceId],
          });
        }
        return insights;
      },
    },
  ],
  questionTemplates: [
    'Which packages are incomplete?',
    'What is attracting views but not bookings?',
    'Where is the catalogue concentrated?',
  ],
});
