import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockEventFindUnique,
  mockEventCreate,
  mockLeadFindUnique,
  mockLeadUpdate,
  mockSelectionFindFirst,
  mockSelectionFindUnique,
  mockSelectionUpdate,
} = vi.hoisted(() => ({
  mockEventFindUnique: vi.fn(),
  mockEventCreate: vi.fn(),
  mockLeadFindUnique: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockSelectionFindFirst: vi.fn(),
  mockSelectionFindUnique: vi.fn(),
  mockSelectionUpdate: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    leadInternalEvent: { findUnique: mockEventFindUnique, create: mockEventCreate },
    lead: { findUnique: mockLeadFindUnique, update: mockLeadUpdate },
    leadPackageSelection: { findFirst: mockSelectionFindFirst, findUnique: mockSelectionFindUnique, update: mockSelectionUpdate },
  },
}));

import { applyEventToLead, findSelectionForEvent, handleLeadEvent } from '../lead-events.service.js';
import AppError from '../../utils/appError.js';

const quotedLead = { id: 'lead-1', lifecycleStatus: 'QUOTED', primarySelectionId: 'sel-1' };
const selection = {
  id: 'sel-1',
  leadId: 'lead-1',
  packageId: 'pkg-1',
  isManual: false,
  quoteAcceptedAt: null,
  pricing: { paidAmount: '100.00', depositAmount: '300.00', totalAmount: '1000.00', balanceDue: '900.00' },
};

describe('applyEventToLead', () => {
  it('records acceptance on the selection without changing the lead', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      selection,
      event: { type: 'quotation.accepted', payload: { quoteId: 'q-1' }, occurredAt: '2026-08-02T10:00:00Z' },
    });
    expect(result.target).toBe('selection');
    expect(result.data.quoteAcceptedAt).toBeInstanceOf(Date);
  });

  it('is a no-op for acceptance when there is no matching selection', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      selection: null,
      event: { type: 'quotation.accepted', payload: {} },
    });
    expect(result).toBeNull();
  });

  it('is idempotent — a second acceptance on an already-accepted selection is a no-op', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      selection: { ...selection, quoteAcceptedAt: new Date('2026-08-01') },
      event: { type: 'quotation.accepted', payload: {} },
    });
    expect(result).toBeNull();
  });

  it('moves QUOTED -> REVISION lead-wide on rejection, regardless of selection', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      selection,
      event: { type: 'quotation.rejected', payload: { reason: 'Too expensive' } },
    });
    expect(result.target).toBe('lead');
    expect(result.data.lifecycleStatus).toBe('REVISION');
    expect(result.data.statusHistory.create[0]).toEqual({
      status: 'REVISION',
      actor: 'SYSTEM',
      changedById: null,
      notes: 'Too expensive',
    });
  });

  it('ignores stale rejections for leads that already moved on', () => {
    const result = applyEventToLead({
      lead: { ...quotedLead, lifecycleStatus: 'APPROVED' },
      selection,
      event: { type: 'quotation.rejected' },
    });
    expect(result).toBeNull();
  });

  it('moves QUOTED -> REVISION on expiry', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      selection,
      event: { type: 'quotation.expired' },
    });
    expect(result.data.lifecycleStatus).toBe('REVISION');
  });

  it('approves the lead when a verified payment covers the deposit', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      selection,
      event: { type: 'payment.verified', payload: { amount: 200 } },
    });
    expect(result.target).toBe('selection');
    expect(result.data.pricing.update.paidAmount).toBe(300);
    expect(result.data.pricing.update.balanceDue).toBe(700);
    expect(result.leadData.lifecycleStatus).toBe('APPROVED');
    expect(result.leadData.statusHistory.create[0].actor).toBe('SYSTEM');
    expect(result.statusChanged).toBe(true);
  });

  it('updates paid totals without approving when the deposit is not covered', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      selection,
      event: { type: 'payment.verified', payload: { amount: 50 } },
    });
    expect(result.data.pricing.update.paidAmount).toBe(150);
    expect(result.leadData).toBeUndefined();
    expect(result.statusChanged).toBe(false);
  });

  it('is a no-op for a payment event with no matching selection', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      selection: null,
      event: { type: 'payment.verified', payload: { amount: 50 } },
    });
    expect(result).toBeNull();
  });

  it('rejects unknown event types', () => {
    expect(() =>
      applyEventToLead({ lead: quotedLead, selection, event: { type: 'nope' } }),
    ).toThrow(AppError);
  });
});

describe('findSelectionForEvent', () => {
  beforeEach(() => {
    mockSelectionFindFirst.mockReset();
    mockSelectionFindUnique.mockReset();
  });

  it('finds the selection matching the event packageId', async () => {
    mockSelectionFindFirst.mockResolvedValue(selection);
    const result = await findSelectionForEvent(quotedLead, 'pkg-1');
    expect(mockSelectionFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { leadId: 'lead-1', packageId: 'pkg-1' },
    }));
    expect(result).toBe(selection);
  });

  it('finds the manual selection when packageId is falsy', async () => {
    mockSelectionFindFirst.mockResolvedValue({ ...selection, isManual: true, packageId: null });
    await findSelectionForEvent(quotedLead, null);
    expect(mockSelectionFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { leadId: 'lead-1', isManual: true },
    }));
  });

  it('falls back to the primary selection when no packageId match is found', async () => {
    mockSelectionFindFirst.mockResolvedValue(null);
    mockSelectionFindUnique.mockResolvedValue(selection);
    const result = await findSelectionForEvent(quotedLead, 'unknown-pkg');
    expect(mockSelectionFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'sel-1' } }));
    expect(result).toBe(selection);
  });

  it('returns null when there is no match and no primary selection', async () => {
    mockSelectionFindFirst.mockResolvedValue(null);
    const result = await findSelectionForEvent({ ...quotedLead, primarySelectionId: null }, 'unknown-pkg');
    expect(result).toBeNull();
  });
});

describe('handleLeadEvent', () => {
  beforeEach(() => {
    mockEventFindUnique.mockReset();
    mockEventCreate.mockReset();
    mockLeadFindUnique.mockReset();
    mockLeadUpdate.mockReset();
    mockSelectionFindFirst.mockReset();
    mockSelectionFindUnique.mockReset();
    mockSelectionUpdate.mockReset();
  });

  it('short-circuits duplicate event ids', async () => {
    mockEventFindUnique.mockResolvedValue({ id: 'evt-1' });
    const result = await handleLeadEvent({
      event: { id: 'evt-1', type: 'payment.verified', leadId: 'lead-1' },
    });
    expect(result).toEqual({ duplicate: true });
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it('applies a payment event to the matching selection and records the processed event', async () => {
    mockEventFindUnique.mockResolvedValue(null);
    mockLeadFindUnique.mockResolvedValue(quotedLead);
    mockSelectionFindFirst.mockResolvedValue(selection);
    mockSelectionUpdate.mockResolvedValue({ id: 'sel-1' });
    mockLeadUpdate.mockResolvedValue({ id: 'lead-1' });
    mockEventCreate.mockResolvedValue({ id: 'row-1' });

    const result = await handleLeadEvent({
      event: { id: 'evt-2', type: 'payment.verified', leadId: 'lead-1', payload: { amount: 200, packageId: 'pkg-1' } },
    });

    expect(result).toEqual({ processed: true, changed: true });
    expect(mockSelectionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sel-1' },
      data: expect.objectContaining({ pricing: { update: expect.objectContaining({ paidAmount: 300 }) } }),
    }));
    expect(mockLeadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lead-1' },
      data: expect.objectContaining({ lifecycleStatus: 'APPROVED' }),
    }));
    expect(mockEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventId: 'evt-2', leadId: 'lead-1', type: 'payment.verified' }),
    });
  });

  it('a second selection on the same lead is untouched by an event scoped to the first', async () => {
    mockEventFindUnique.mockResolvedValue(null);
    mockLeadFindUnique.mockResolvedValue(quotedLead);
    mockSelectionFindFirst.mockResolvedValue(selection); // matches packageId: 'pkg-1' only
    mockSelectionUpdate.mockResolvedValue({ id: 'sel-1' });
    mockEventCreate.mockResolvedValue({ id: 'row-1' });

    await handleLeadEvent({
      event: { id: 'evt-4', type: 'quotation.accepted', leadId: 'lead-1', payload: { packageId: 'pkg-1' } },
    });

    expect(mockSelectionFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { leadId: 'lead-1', packageId: 'pkg-1' },
    }));
    expect(mockSelectionUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'sel-1' } }));
    expect(mockSelectionUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'sel-2' } }));
  });

  it('throws for events missing the mandatory fields', async () => {
    await expect(handleLeadEvent({ event: { type: 'payment.verified' } })).rejects.toThrow(AppError);
  });

  it('throws when the lead does not exist', async () => {
    mockEventFindUnique.mockResolvedValue(null);
    mockLeadFindUnique.mockResolvedValue(null);
    await expect(
      handleLeadEvent({ event: { id: 'evt-3', type: 'quotation.accepted', leadId: 'ghost' } }),
    ).rejects.toThrow(/Lead not found/);
  });
});
