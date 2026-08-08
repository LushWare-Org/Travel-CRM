import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEventFindUnique, mockEventCreate, mockLeadFindUnique, mockLeadUpdate } = vi.hoisted(
  () => ({
    mockEventFindUnique: vi.fn(),
    mockEventCreate: vi.fn(),
    mockLeadFindUnique: vi.fn(),
    mockLeadUpdate: vi.fn(),
  }),
);

vi.mock('../../db/client.js', () => ({
  default: {
    leadInternalEvent: { findUnique: mockEventFindUnique, create: mockEventCreate },
    lead: { findUnique: mockLeadFindUnique, update: mockLeadUpdate },
  },
}));

import { applyEventToLead, handleLeadEvent } from '../lead-events.service.js';
import AppError from '../../utils/appError.js';

const quotedLead = {
  id: 'lead-1',
  lifecycleStatus: 'QUOTED',
  quoteAcceptedAt: null,
  pricing: { paidAmount: '100.00', depositAmount: '300.00', totalAmount: '1000.00', balanceDue: '900.00' },
};

describe('applyEventToLead', () => {
  it('records acceptance without changing the lifecycle status', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      event: { type: 'quotation.accepted', payload: { quoteId: 'q-1' }, occurredAt: '2026-08-02T10:00:00Z' },
    });
    expect(result.data.quoteAcceptedAt).toBeInstanceOf(Date);
    expect(result.data.lifecycleStatus).toBeUndefined();
  });

  it('moves QUOTED -> REVISION on rejection with a SYSTEM history entry', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      event: { type: 'quotation.rejected', payload: { reason: 'Too expensive' } },
    });
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
      event: { type: 'quotation.rejected' },
    });
    expect(result).toBeNull();
  });

  it('moves QUOTED -> REVISION on expiry', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      event: { type: 'quotation.expired' },
    });
    expect(result.data.lifecycleStatus).toBe('REVISION');
  });

  it('approves the lead when a verified payment covers the deposit', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      event: { type: 'payment.verified', payload: { amount: 200 } },
    });
    expect(result.data.lifecycleStatus).toBe('APPROVED');
    expect(result.data.pricing.update.paidAmount).toBe(300);
    expect(result.data.pricing.update.balanceDue).toBe(700);
    expect(result.data.statusHistory.create[0].actor).toBe('SYSTEM');
    expect(result.statusChanged).toBe(true);
  });

  it('updates paid totals without approving when the deposit is not covered', () => {
    const result = applyEventToLead({
      lead: quotedLead,
      event: { type: 'payment.verified', payload: { amount: 50 } },
    });
    expect(result.data.pricing.update.paidAmount).toBe(150);
    expect(result.data.lifecycleStatus).toBeUndefined();
    expect(result.statusChanged).toBe(false);
  });

  it('rejects unknown event types', () => {
    expect(() =>
      applyEventToLead({ lead: quotedLead, event: { type: 'nope' } }),
    ).toThrow(AppError);
  });
});

describe('handleLeadEvent', () => {
  beforeEach(() => {
    mockEventFindUnique.mockReset();
    mockEventCreate.mockReset();
    mockLeadFindUnique.mockReset();
    mockLeadUpdate.mockReset();
  });

  it('short-circuits duplicate event ids', async () => {
    mockEventFindUnique.mockResolvedValue({ id: 'evt-1' });
    const result = await handleLeadEvent({
      event: { id: 'evt-1', type: 'payment.verified', leadId: 'lead-1' },
    });
    expect(result).toEqual({ duplicate: true });
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it('applies a payment event and records the processed event', async () => {
    mockEventFindUnique.mockResolvedValue(null);
    mockLeadFindUnique.mockResolvedValue(quotedLead);
    mockLeadUpdate.mockResolvedValue({ id: 'lead-1' });
    mockEventCreate.mockResolvedValue({ id: 'row-1' });

    const result = await handleLeadEvent({
      event: { id: 'evt-2', type: 'payment.verified', leadId: 'lead-1', payload: { amount: 200 } },
    });

    expect(result).toEqual({ processed: true, changed: true });
    expect(mockLeadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-1' },
        data: expect.objectContaining({ lifecycleStatus: 'APPROVED' }),
      }),
    );
    expect(mockEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventId: 'evt-2', leadId: 'lead-1', type: 'payment.verified' }),
    });
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
