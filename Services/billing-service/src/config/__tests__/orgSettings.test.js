import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getOrgSettings, _resetCache, toBrandingShape, getBankDetails, hasBankDetails } from '../orgSettings.js';

function fakeSettingsResponse(overrides = {}) {
  return {
    ok: true,
    json: async () => ({
      status: 'success',
      data: { settings: { companyName: 'Lush Travel', defaultCurrency: 'USD', ...overrides } },
    }),
  };
}

beforeEach(() => {
  _resetCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getOrgSettings', () => {
  it('fetches from user-service and returns the settings row', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeSettingsResponse());
    const settings = await getOrgSettings({ fetchImpl });
    expect(settings.companyName).toBe('Lush Travel');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('serves the cached value on a second call within the TTL, without refetching', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeSettingsResponse());
    await getOrgSettings({ fetchImpl });
    await getOrgSettings({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refetches once the cache TTL has expired', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValue(fakeSettingsResponse());
    await getOrgSettings({ fetchImpl });
    vi.advanceTimersByTime(61_000);
    await getOrgSettings({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('falls back to env-var defaults without throwing when the fetch rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const settings = await getOrgSettings({ fetchImpl });
    expect(settings.companyName).toBe('Travel CRM');
    expect(settings.defaultCurrency).toBe('USD');
    expect(settings.quotationValidityDays).toBe(30);
  });

  it('falls back without throwing when user-service responds with a non-2xx status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const settings = await getOrgSettings({ fetchImpl });
    expect(settings.companyName).toBe('Travel CRM');
  });

  it('serves the last good cached value (not the static fallback) when a later refetch fails', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(fakeSettingsResponse({ companyName: 'Lush Travel' }))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await getOrgSettings({ fetchImpl });
    vi.advanceTimersByTime(61_000);
    const settings = await getOrgSettings({ fetchImpl });
    expect(settings.companyName).toBe('Lush Travel');
  });
});

describe('toBrandingShape', () => {
  it('maps flat OrganizationSettings fields onto the nested branding structure', () => {
    const branding = toBrandingShape({
      companyName: 'Lush Travel',
      tagline: 'Explore More',
      contactEmail: 'hi@lush.test',
      contactPhone: '+1-555-0100',
      website: 'https://lush.test',
      logoUrl: 'https://cdn.lush.test/logo.png',
    });
    expect(branding.company.name).toBe('Lush Travel');
    expect(branding.company.tagline).toBe('Explore More');
    expect(branding.contact.email).toBe('hi@lush.test');
    expect(branding.urls.logo).toBe('https://cdn.lush.test/logo.png');
  });

  it('falls back to the default payment methods list when none are configured', () => {
    const branding = toBrandingShape({ companyName: 'Lush Travel', paymentMethods: [] });
    expect(branding.content.paymentMethods).toContain('Bank Transfer');
  });

  it('uses the configured payment methods list when present', () => {
    const branding = toBrandingShape({ companyName: 'Lush Travel', paymentMethods: ['Cash'] });
    expect(branding.content.paymentMethods).toEqual(['Cash']);
  });
});

describe('hasBankDetails', () => {
  it('is true when both bank name and account number are configured', () => {
    const branding = toBrandingShape({ companyName: 'X', bankName: 'Test Bank', bankAccountNumber: '12345' });
    expect(hasBankDetails(branding)).toBe(true);
    expect(getBankDetails(branding).bankName).toBe('Test Bank');
  });

  it('is false when bank details are absent', () => {
    const branding = toBrandingShape({ companyName: 'X' });
    expect(hasBankDetails(branding)).toBe(false);
  });
});
