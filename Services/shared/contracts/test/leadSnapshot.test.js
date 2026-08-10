import { describe, it, expect } from 'vitest';
import { LeadSnapshotForQuotation } from '../src/leadSnapshot.js';

function validPayload(overrides = {}) {
  return {
    leadId: 'lead-1',
    packageId: 'pkg-1',
    createdById: null,
    currency: 'USD',
    customer: { name: 'Jane Doe', email: 'jane@example.com', phone: '555-0100', address: 'Colombo' },
    items: [{ description: 'Hotel', category: 'accommodation', quantity: 1, unitPrice: '1250.00', notes: null }],
    discountType: 'none',
    discountValue: 0,
    serviceChargeRate: 0,
    notes: null,
    terms: null,
    paymentTerms: null,
    includedServices: ['Breakfast'],
    excludedServices: ['Flights'],
    destination: 'Sri Lanka',
    packageTitle: 'Island Escape',
    travelStartDate: '2026-09-01',
    travelEndDate: '2026-09-08',
    paxCount: 2,
    durationNights: 7,
    durationDays: 8,
    highlights: ['Beaches', 'Wildlife'],
    itineraryDays: [{ day: 1, title: 'Arrival', locations: ['Colombo'], meals: ['Dinner'] }],
    coverImage: null,
    ...overrides,
  };
}

describe('LeadSnapshotForQuotation', () => {
  it('parses the real snapshot payload shape unchanged', () => {
    const payload = validPayload();
    expect(LeadSnapshotForQuotation.parse(payload).leadId).toBe('lead-1');
  });

  it('accepts null for always-nullable fields (createdById, notes, terms, paymentTerms)', () => {
    const payload = validPayload({ createdById: null, notes: null, terms: null, paymentTerms: null });
    expect(() => LeadSnapshotForQuotation.parse(payload)).not.toThrow();
  });

  it('coerces a Decimal-as-string unitPrice on an item', () => {
    const payload = validPayload({ items: [{ description: 'Hotel', category: 'accommodation', quantity: 1, unitPrice: '999.99', notes: null }] });
    expect(LeadSnapshotForQuotation.parse(payload).items[0].unitPrice).toBe(999.99);
  });

  it('rejects a payload missing leadId', () => {
    const payload = validPayload();
    delete payload.leadId;
    expect(() => LeadSnapshotForQuotation.parse(payload)).toThrow();
  });

  it('rejects items that are not an array', () => {
    const payload = validPayload({ items: 'not-an-array' });
    expect(() => LeadSnapshotForQuotation.parse(payload)).toThrow();
  });
});
