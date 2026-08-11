import { describe, it, expect } from 'vitest';
import { OrganizationSettings, OrganizationSettingsUpdate } from '../src/organizationSettings.js';

function settingsRow(overrides = {}) {
  return {
    id: 'org-settings-1',
    companyName: 'Travel CRM',
    defaultCurrency: 'USD',
    defaultTaxRate: '5.00',
    defaultServiceChargeRate: '2.50',
    quotationValidityDays: 30,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('OrganizationSettings', () => {
  it('parses a full singleton row with Decimal fields serialized as strings', () => {
    const parsed = OrganizationSettings.parse(settingsRow());
    expect(parsed.defaultTaxRate).toBe(5);
    expect(parsed.defaultServiceChargeRate).toBe(2.5);
  });

  it('passes through id/timestamps not explicitly modeled', () => {
    const parsed = OrganizationSettings.parse(settingsRow());
    expect(parsed.id).toBe('org-settings-1');
  });

  it('rejects a currency code that is not exactly 3 characters', () => {
    expect(() => OrganizationSettings.parse(settingsRow({ defaultCurrency: 'US' }))).toThrow();
  });

  it('rejects a tax rate above 100', () => {
    expect(() => OrganizationSettings.parse(settingsRow({ defaultTaxRate: '150.00' }))).toThrow();
  });

  it('rejects a negative service charge rate', () => {
    expect(() =>
      OrganizationSettings.parse(settingsRow({ defaultServiceChargeRate: '-1.00' }))
    ).toThrow();
  });

  it('rejects a non-positive quotation validity window', () => {
    expect(() => OrganizationSettings.parse(settingsRow({ quotationValidityDays: 0 }))).toThrow();
  });
});

describe('OrganizationSettingsUpdate', () => {
  it('accepts a partial update payload with a single field', () => {
    expect(() => OrganizationSettingsUpdate.parse({ companyName: 'Lush Travel' })).not.toThrow();
  });

  it('accepts an empty payload (no-op update)', () => {
    expect(() => OrganizationSettingsUpdate.parse({})).not.toThrow();
  });

  it('rejects unknown keys (whitelist validation)', () => {
    expect(() => OrganizationSettingsUpdate.parse({ notARealField: true })).toThrow();
  });

  it('rejects an invalid contact email', () => {
    expect(() =>
      OrganizationSettingsUpdate.parse({ contactEmail: 'not-an-email' })
    ).toThrow();
  });

  it('accepts a partial docNumberPrefixes object', () => {
    const parsed = OrganizationSettingsUpdate.parse({
      docNumberPrefixes: { quotation: 'QUO' },
    });
    expect(parsed.docNumberPrefixes.quotation).toBe('QUO');
  });

  it('rejects a companyName that is an empty string', () => {
    expect(() => OrganizationSettingsUpdate.parse({ companyName: '' })).toThrow();
  });
});
