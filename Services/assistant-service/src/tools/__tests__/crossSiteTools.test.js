import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockDomainAuthHeader } = vi.hoisted(() => ({ mockDomainAuthHeader: vi.fn() }));

vi.mock('../../utils/cloudRunAuth.js', () => ({ domainAuthHeader: mockDomainAuthHeader }));

const { executeTool } = await import('../toolRegistry.js');

const ANALYTICS = 'http://analytics.test';
const PACKAGES = 'http://packages.test';

const ctx = { user: { id: 'rep-1', role: 'admin' }, headers: { 'x-user-id': 'rep-1' } };

let realFetch;

beforeEach(() => {
  process.env.ANALYTICS_SERVICE_URL = ANALYTICS;
  process.env.PACKAGE_SERVICE_URL = PACKAGES;
  mockDomainAuthHeader.mockReset();
  mockDomainAuthHeader.mockResolvedValue({ Authorization: 'Bearer test-token' });
  realFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.ANALYTICS_SERVICE_URL;
  delete process.env.PACKAGE_SERVICE_URL;
});

function captureFetch(body, status = 200) {
  const calls = [];
  globalThis.fetch = vi.fn(async (url, init) => {
    calls.push({ url, init });
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  });
  return calls;
}

// One test per cross-site tool: the URL it calls, what the projection keeps, and
// what it must never let through. The projection tests deliberately include a
// field the allowlist excludes, because an allowlist is only proven by what it
// drops.

describe('getDashboardSnapshot', () => {
  it('reads the company snapshot and excludes the PII rows the projection omits', async () => {
    const calls = captureFetch({
      success: true,
      data: {
        leads: { total: 40, new: 3 },
        bookings: { total: 8 },
        revenue: { total: 1000 },
        packages: { total: 7 },
        leadsByStatus: [{ status: 'NEW', count: 3 }],
        // Both of these carry customer emails and are not in the projection.
        recentLeads: [{ id: 'l1', email: 'traveller@example.com' }],
        recentBookings: [{ id: 'b1', totalAmount: '10' }],
      },
    });

    const result = await executeTool('getDashboardSnapshot', {}, ctx, ['getDashboardSnapshot']);

    expect(calls[0].url).toBe(`${ANALYTICS}/api/v1/dashboard/stats`);
    expect(result.data[0].leads).toEqual({ total: 40, new: 3 });
    expect(result.data[0].leadsByStatus).toEqual([{ status: 'NEW', count: 3 }]);
    expect(result.data[0].recentLeads).toBeUndefined();
    expect(result.data[0].recentBookings).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('traveller@example.com');
  });

  it('rejects an unexpected argument rather than silently ignoring it', async () => {
    const result = await executeTool('getDashboardSnapshot', { timeRange: 'monthly' }, ctx, [
      'getDashboardSnapshot',
    ]);

    // The route has no window parameter; accepting one would put a claim in the
    // prompt that the service never honoured.
    expect(result.error).toMatch(/^invalid args for getDashboardSnapshot:/);
  });

  it('maps a 403 to notAuthorized', async () => {
    captureFetch({}, 403);
    const result = await executeTool('getDashboardSnapshot', {}, ctx, ['getDashboardSnapshot']);
    expect(result).toEqual({ notAuthorized: true });
  });
});

describe('getLeadAnalytics', () => {
  it('reads the lead overview, and only when asked does it pass a window', async () => {
    const calls = captureFetch({ success: true, data: { stats: { totalLeads: 40 }, topDestinations: [] } });

    await executeTool('getLeadAnalytics', { timeRange: 'weekly' }, ctx, ['getLeadAnalytics']);

    expect(calls[0].url).toBe(`${ANALYTICS}/api/v1/analytics/leads/overview?timeRange=weekly`);
  });

  it('omits the window entirely when the model does not ask for one', async () => {
    const calls = captureFetch({ success: true, data: { stats: {} } });

    await executeTool('getLeadAnalytics', {}, ctx, ['getLeadAnalytics']);

    // The service's own default applies; sending a value it did not choose would
    // misreport the window in the prompt.
    expect(calls[0].url).toBe(`${ANALYTICS}/api/v1/analytics/leads/overview`);
  });

  it('rejects a window outside the service enum', async () => {
    const result = await executeTool('getLeadAnalytics', { timeRange: 'yesterday' }, ctx, ['getLeadAnalytics']);
    expect(result.error).toMatch(/^invalid args for getLeadAnalytics:/);
  });

  it('keeps the aggregate groups and drops anything else in the payload', async () => {
    captureFetch({
      success: true,
      data: { stats: { totalLeads: 40 }, topDestinations: [{ destination: 'Goa', leads: 14 }], debugSql: 'select 1' },
    });

    const result = await executeTool('getLeadAnalytics', {}, ctx, ['getLeadAnalytics']);

    expect(result.data[0].topDestinations).toEqual([{ destination: 'Goa', leads: 14 }]);
    expect(result.data[0].debugSql).toBeUndefined();
  });
});

describe('getPackagePerformance', () => {
  it('reads package performance, which is what answers the packages questions', async () => {
    const calls = captureFetch({
      success: true,
      data: {
        stats: { totalItineraries: 7, totalInquiries: 12, totalConversions: 2 },
        trend: [{ month: 'Sep 2026', inquiries: 4, conversions: 1 }],
        destinationPerformance: [{ destination: 'Bali', inquiries: 5, conversions: 2 }],
        mostInquired: [{ name: 'Bali Adventure Deluxe', inquiries: 5, conversions: 2 }],
      },
    });

    const result = await executeTool('getPackagePerformance', { timeRange: 'monthly' }, ctx, [
      'getPackagePerformance',
    ]);

    expect(calls[0].url).toBe(`${ANALYTICS}/api/v1/analytics/packages/overview?timeRange=monthly`);
    expect(result.data[0].mostInquired[0].name).toBe('Bali Adventure Deluxe');
    expect(result.data[0].destinationPerformance[0].destination).toBe('Bali');
  });
});

describe('getSalesPerformance', () => {
  it('reads the team list and projects only the three declared fields', async () => {
    const calls = captureFetch({
      success: true,
      data: [
        { rep: 'Bob Sales', sales: 12, conversion: 33.3, email: 'bob@example.com', userId: 'u1' },
        { rep: 'Carol Sales', sales: 8, conversion: 25 },
      ],
    });

    const result = await executeTool('getSalesPerformance', {}, ctx, ['getSalesPerformance']);

    expect(calls[0].url).toBe(`${ANALYTICS}/api/v1/analytics/salesreps/performance`);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ rep: 'Bob Sales', sales: 12, conversion: 33.3 });
    expect(JSON.stringify(result)).not.toContain('bob@example.com');
  });
});

describe('getMyPerformance', () => {
  it('reads the caller\'s own book and excludes the recent-lead rows', async () => {
    const calls = captureFetch({
      success: true,
      data: {
        performance: { leadsAssigned: 20, converted: 4, pending: 9, conversionRate: 20 },
        recentLeads: [{ id: 'l1', email: 'traveller@example.com' }],
      },
    });

    const result = await executeTool('getMyPerformance', {}, ctx, ['getMyPerformance']);

    expect(calls[0].url).toBe(`${ANALYTICS}/api/v1/analytics/salesreps/me/performance`);
    expect(result.data[0].performance).toEqual({
      leadsAssigned: 20,
      converted: 4,
      pending: 9,
      conversionRate: 20,
    });
    expect(result.data[0].recentLeads).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('traveller@example.com');
  });
});

describe('searchPackages', () => {
  it('searches the catalogue and keeps the fields a price or rating question needs', async () => {
    const calls = captureFetch({
      success: true,
      data: [
        {
          id: 'p1',
          title: 'Bali Adventure Deluxe',
          destination: 'Bali',
          durationDays: 7,
          category: 'Adventure',
          basePrice: 1000,
          sellPrice: 1300,
          currency: 'USD',
          rating: 4.5,
          numReviews: 12,
          views: 400,
          bookings: 9,
          isActive: true,
          isFeatured: true,
          description: 'a very long description',
          images: [{ url: 'https://example.com/a.jpg' }],
        },
      ],
    });

    const result = await executeTool('searchPackages', { q: 'bali adventure' }, ctx, ['searchPackages']);

    expect(calls[0].url).toBe(`${PACKAGES}/api/v1/packages/search/query?q=bali%20adventure`);
    expect(result.data[0].title).toBe('Bali Adventure Deluxe');
    expect(result.data[0].sellPrice).toBe(1300);
    // Not needed to answer a question, and the images are the heaviest thing in
    // the payload.
    expect(result.data[0].description).toBeUndefined();
    expect(result.data[0].images).toBeUndefined();
  });

  it('requires a query, because the endpoint 400s without one', async () => {
    const result = await executeTool('searchPackages', {}, ctx, ['searchPackages']);
    expect(result.error).toMatch(/^invalid args for searchPackages:/);
  });

  it('maps an unavailable service to unavailable rather than an error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const result = await executeTool('searchPackages', { q: 'bali' }, ctx, ['searchPackages']);
    expect(result).toEqual({ unavailable: true });
  });
});
