import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindFirst, mockCreate, mockUpdate, mockDeleteMany, mockNextNumber } = vi.hoisted(
  () => ({
    mockFindFirst: vi.fn(),
    mockCreate: vi.fn(),
    mockUpdate: vi.fn(),
    mockDeleteMany: vi.fn(),
    mockNextNumber: vi.fn(),
  }),
);

vi.mock('../../db/client.js', () => ({
  default: {
    quotation: {
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
    },
    quotationItem: { deleteMany: mockDeleteMany },
  },
}));

vi.mock('../../utils/docNumber.js', () => ({
  nextQuotationNumber: mockNextNumber,
}));

import {
  quotationTotals,
  createOrVersionQuotation,
} from '../quotation.service.js';

const items = [
  { description: 'Package', category: 'package', quantity: 1, unitPrice: 800 },
  { description: 'Flights', category: 'transportation', quantity: 4, unitPrice: 200 },
];

describe('quotationTotals', () => {
  it('applies discount before tax and service charge on top', () => {
    const totals = quotationTotals(items, {
      taxRate: 18,
      serviceChargeRate: 5,
      discountType: 'percentage',
      discountValue: 10,
    });
    // subtotal 1600, discount 160, taxable 1440, tax 259.2, service 80, total 1779.2
    expect(totals.subtotal).toBe(1600);
    expect(totals.discountAmount).toBe(160);
    expect(totals.taxableSubtotal).toBe(1440);
    expect(totals.taxAmount).toBe(259.2);
    expect(totals.serviceChargeAmount).toBe(80);
    expect(totals.totalAmount).toBe(1779.2);
  });

  it('supports fixed discounts', () => {
    const totals = quotationTotals(items, {
      taxRate: 18,
      discountType: 'fixed',
      discountValue: 100,
    });
    expect(totals.discountAmount).toBe(100);
    expect(totals.taxableSubtotal).toBe(1500);
    expect(totals.taxAmount).toBe(270);
  });

  it('rejects a submitted total that disagrees with the engine', () => {
    expect(() =>
      quotationTotals(items, {
        taxRate: 18,
        submitted: { subtotal: 1600, totalAmount: 999 },
      }),
    ).toThrow(/not match/i);
  });
});

describe('createOrVersionQuotation', () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDeleteMany.mockReset();
    mockNextNumber.mockReset();
  });

  const payload = {
    leadId: 'lead-1',
    packageId: 'pkg-1',
    currency: 'USD',
    customer: { name: 'Alice', email: 'a@x.com', phone: '123' },
    items,
    taxRate: 18,
    discountType: 'none',
    discountValue: 0,
    serviceChargeRate: 0,
    validUntil: new Date('2026-09-01'),
    createdById: 'user-1',
  };

  it('creates version 1 when the lead has no quotation yet', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockNextNumber.mockResolvedValue('QUO-2026-000001');
    mockCreate.mockResolvedValue({ id: 'quotation-1', version: 1 });

    const result = await createOrVersionQuotation(payload);

    expect(result.id).toBe('quotation-1');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-1',
          quotationNumber: 'QUO-2026-000001',
          version: 1,
          currency: 'USD',
          customerName: 'Alice',
          totalAmount: expect.any(Number),
        }),
      }),
    );
  });

  it('looks up the existing quotation by (leadId, packageId), not leadId alone', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockNextNumber.mockResolvedValue('QUO-2026-000003');
    mockCreate.mockResolvedValue({ id: 'quotation-3', version: 1 });

    await createOrVersionQuotation(payload);

    expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { leadId: 'lead-1', packageId: 'pkg-1' },
    }));
  });

  it('does not collide with a different package quotation on the same lead — creates its own version 1', async () => {
    // No existing row for (lead-1, pkg-2), even though (lead-1, pkg-1) has one — the
    // lookup is scoped by both fields, so this must not find/overwrite pkg-1's quotation.
    mockFindFirst.mockResolvedValue(null);
    mockNextNumber.mockResolvedValue('QUO-2026-000004');
    mockCreate.mockResolvedValue({ id: 'quotation-4', version: 1 });

    const result = await createOrVersionQuotation({ ...payload, packageId: 'pkg-2' });

    expect(result.id).toBe('quotation-4');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ packageId: 'pkg-2', version: 1 }),
    }));
  });

  it('two manual (packageId: null) quotations on different leads do not collide', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockNextNumber.mockResolvedValue('QUO-2026-000005');
    mockCreate.mockResolvedValue({ id: 'quotation-5', version: 1 });

    await createOrVersionQuotation({ ...payload, leadId: 'lead-2', packageId: null });

    expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { leadId: 'lead-2', packageId: null },
    }));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ leadId: 'lead-2', packageId: null }),
    }));
  });

  it('bumps the version and records revision history when a quotation exists', async () => {
    mockFindFirst.mockResolvedValue({ id: 'quotation-1', version: 2 });
    mockUpdate.mockResolvedValue({ id: 'quotation-1', version: 3 });

    const result = await createOrVersionQuotation(payload);

    expect(result.version).toBe(3);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { quotationId: 'quotation-1' } });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'quotation-1' },
        data: expect.objectContaining({
          version: { increment: 1 },
          revisionHistory: {
            create: expect.objectContaining({ version: 2 }),
          },
        }),
      }),
    );
  });

  it('persists engine-derived totals on the quotation', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockNextNumber.mockResolvedValue('QUO-2026-000002');
    mockCreate.mockResolvedValue({ id: 'quotation-2', version: 1 });

    await createOrVersionQuotation({ ...payload, taxRate: 18, discountType: 'percentage', discountValue: 10, serviceChargeRate: 5 });

    const data = mockCreate.mock.calls[0][0].data;
    expect(data.subtotal).toBe(1600);
    expect(data.discountAmount).toBe(160);
    expect(data.taxAmount).toBe(259.2);
    expect(data.serviceChargeAmount).toBe(80);
    expect(data.totalAmount).toBe(1779.2);
    expect(data.items.create).toHaveLength(2);
    // taxableSubtotal is a computed intermediate — it must not be persisted
    // (there is no such Quotation column; Prisma would reject it).
    expect(data).not.toHaveProperty('taxableSubtotal');
  });
});
