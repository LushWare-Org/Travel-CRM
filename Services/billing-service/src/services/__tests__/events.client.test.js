import { describe, it, expect, vi } from 'vitest';
import { emitLeadEvent } from '../events.client.js';

describe('emitLeadEvent', () => {
  it('POSTs the event to the lead service with the internal token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    await emitLeadEvent({
      id: 'evt-1',
      type: 'quotation.accepted',
      leadId: 'lead-1',
      payload: { quoteId: 'q-1' },
      fetchImpl,
    });

    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toContain('/api/v1/leads/internal/events');
    expect(opts.method).toBe('POST');
    expect(opts.headers['x-internal-token']).toBeTypeOf('string');
    const body = JSON.parse(opts.body);
    expect(body.event).toEqual(expect.objectContaining({
      id: 'evt-1',
      type: 'quotation.accepted',
      leadId: 'lead-1',
    }));
  });

  it('throws when the lead service rejects the event', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    await expect(
      emitLeadEvent({ type: 'quotation.rejected', leadId: 'lead-1', fetchImpl }),
    ).rejects.toThrow(/lead-service/i);
  });
});
