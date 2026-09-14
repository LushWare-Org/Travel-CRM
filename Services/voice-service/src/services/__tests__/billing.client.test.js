import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLatestSentDocument, resendDocument } from '../billing.client.js';

const ok = (data) => ({ ok: true, status: 200, json: async () => ({ success: true, data }) });

beforeEach(() => {
  process.env.INTERNAL_EVENTS_TOKEN = 'test-token';
  process.env.BILLING_SERVICE_URL = 'http://billing.test';
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('getLatestSentDocument', () => {
  it('calls the internal latest-document route for the given lead', async () => {
    const spy = vi.fn(async () => ok({ latest: null }));
    vi.stubGlobal('fetch', spy);
    await getLatestSentDocument('lead-1');
    expect(spy.mock.calls[0][0]).toBe('http://billing.test/api/v1/billing/internal/leads/lead-1/latest-document');
  });

  it('sends the internal token rather than any user credential', async () => {
    const spy = vi.fn(async () => ok({ latest: null }));
    vi.stubGlobal('fetch', spy);
    await getLatestSentDocument('lead-1');
    expect(spy.mock.calls[0][1].headers['x-internal-token']).toBe('test-token');
  });

  it('resolves with whatever billing-service reports as the latest document', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ latest: { type: 'invoice', id: 'inv-1' } })));
    await expect(getLatestSentDocument('lead-1')).resolves.toEqual({ latest: { type: 'invoice', id: 'inv-1' } });
  });
});

describe('resendDocument', () => {
  it('posts to the quotation resend-voice route for a quotation', async () => {
    const spy = vi.fn(async () => ok({ email: 'sent', whatsapp: 'sent' }));
    vi.stubGlobal('fetch', spy);
    await resendDocument('quotation', 'quote-1');
    expect(spy.mock.calls[0][0]).toBe('http://billing.test/api/v1/billing/quotations/quote-1/resend-voice');
  });

  it('posts to the invoice resend-voice route for an invoice', async () => {
    const spy = vi.fn(async () => ok({ email: 'sent', whatsapp: null }));
    vi.stubGlobal('fetch', spy);
    await resendDocument('invoice', 'inv-1');
    expect(spy.mock.calls[0][0]).toBe('http://billing.test/api/v1/billing/invoices/inv-1/resend-voice');
  });

  it('posts to the receipt resend-voice route for a receipt', async () => {
    const spy = vi.fn(async () => ok({ email: 'sent', whatsapp: null }));
    vi.stubGlobal('fetch', spy);
    await resendDocument('receipt', 'rec-1');
    expect(spy.mock.calls[0][0]).toBe('http://billing.test/api/v1/billing/receipts/rec-1/resend-voice');
  });

  it('posts to the voucher resend-voice route for a voucher', async () => {
    const spy = vi.fn(async () => ok({ email: 'sent', whatsapp: null }));
    vi.stubGlobal('fetch', spy);
    await resendDocument('voucher', 'vch-1');
    expect(spy.mock.calls[0][0]).toBe('http://billing.test/api/v1/billing/vouchers/vch-1/resend-voice');
  });

  it('throws synchronously for an unknown document type, without calling the network', () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    expect(() => resendDocument('flight-ticket', 'x-1')).toThrow(/Unknown document type/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sends the internal token rather than any user credential', async () => {
    const spy = vi.fn(async () => ok({ email: 'sent', whatsapp: null }));
    vi.stubGlobal('fetch', spy);
    await resendDocument('quotation', 'quote-1');
    expect(spy.mock.calls[0][1].headers['x-internal-token']).toBe('test-token');
  });

  it('resolves with the per-channel result', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ email: 'sent', whatsapp: 'failed' })));
    await expect(resendDocument('quotation', 'quote-1')).resolves.toEqual({ email: 'sent', whatsapp: 'failed' });
  });

  it('surfaces billing-service refusing to resend an unsent document', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 409, json: async () => ({ message: 'This quotation has not been sent yet' }),
    })));
    await expect(resendDocument('quotation', 'quote-1')).rejects.toThrow(/has not been sent yet/);
  });

  it('refuses to call billing-service when no internal token is configured', async () => {
    delete process.env.INTERNAL_EVENTS_TOKEN;
    await expect(resendDocument('quotation', 'quote-1')).rejects.toThrow(/INTERNAL_EVENTS_TOKEN/);
  });
});
