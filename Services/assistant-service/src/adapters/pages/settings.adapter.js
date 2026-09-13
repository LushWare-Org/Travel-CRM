import { z } from 'zod';
import { createPageAdapter } from '../collectionEngine.js';

// Settings is the singleton case the engine's `shape: 'singleton'` support
// exists for: one organisation document, no collection, so every rule here is a
// completeness check rather than a threshold over rows.
//
// Bank fields are NOT in the field list. They are sensitive, they are excluded
// from every admin response path except the token-authenticated one, and a
// briefing that read them would put account numbers in a model prompt.
const SETTINGS_FIELDS = [
  'id',
  'companyName',
  'companyShortName',
  'companyAddress',
  'companyGstNumber',
  'tagline',
  'logoUrl',
  'contactEmail',
  'salesEmail',
  'supportEmail',
  'contactPhone',
  'whatsappNumber',
  'website',
  'defaultCurrency',
  'quotationValidityDays',
  'updatedAt',
];

export const settingsAdapter = createPageAdapter({
  key: 'settings',
  scopeSchema: z.object({}).strict(),
  scopeLabel: () => 'Organization settings',
  sources: [
    {
      name: 'settings',
      shape: 'singleton',
      envKey: 'USER_SERVICE_URL',
      path: '/api/v1/admin/settings',
      listPath: 'data.settings',
      recordKind: 'settings',
      idField: 'id',
      fields: SETTINGS_FIELDS,
      label: 'Organization settings',
    },
  ],
  rules: [
    {
      source: 'settings',
      rule: 'missingField',
      field: 'supportEmail',
      section: 'attention',
      severity: 'warning',
      text: 'No support email is configured — customer replies have nowhere to land.',
    },
    {
      source: 'settings',
      rule: 'missingField',
      field: 'companyAddress',
      section: 'attention',
      severity: 'warning',
      text: 'No company address is configured, so it cannot appear on documents or the contact page.',
    },
    {
      source: 'settings',
      rule: 'missingField',
      field: 'logoUrl',
      section: 'attention',
      severity: 'info',
      text: 'No logo is configured.',
    },
    {
      source: 'settings',
      rule: 'missingField',
      field: 'whatsappNumber',
      section: 'experienced_view',
      severity: 'info',
      text: 'No WhatsApp number is configured — the primary customer channel is unset.',
    },
    {
      source: 'settings',
      rule: 'staleForDays',
      field: 'updatedAt',
      days: 180,
      section: 'changed',
      severity: 'info',
      text: 'Organization settings have not been reviewed in six months.',
    },
  ],
  questionTemplates: [
    'What is missing from our organization settings?',
    'What would a customer notice is unset?',
    'When were these settings last reviewed?',
  ],
});
