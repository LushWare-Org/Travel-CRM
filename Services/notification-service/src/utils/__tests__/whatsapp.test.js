import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isWhatsappConfigured, sendWhatsappTemplateMessage, sendWhatsappTextMessage } from '../whatsapp.js';

const ORIGINAL_ENV = { ...process.env };

function setWhatsappEnv() {
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
  process.env.WHATSAPP_API_VERSION = 'v23.0';
}

function clearWhatsappEnv() {
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
}

function mockFetchOk(body = { messages: [{ id: 'wamid.123' }] }) {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
}

function mockFetchError(status, errorBody = { error: { message: 'Invalid parameter' } }) {
  return vi.fn().mockResolvedValue({ ok: false, status, json: async () => errorBody });
}

describe('isWhatsappConfigured', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns false when WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID are unset', () => {
    clearWhatsappEnv();
    expect(isWhatsappConfigured()).toBe(false);
  });

  it('returns true when both are set', () => {
    setWhatsappEnv();
    expect(isWhatsappConfigured()).toBe(true);
  });
});

describe('sendWhatsappTemplateMessage', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    setWhatsappEnv();
  });

  it('throws a 503 error when WhatsApp is not configured', async () => {
    clearWhatsappEnv();

    await expect(
      sendWhatsappTemplateMessage({ to: '15551234567', templateName: 'quotation_ready', fetchImpl: mockFetchOk() })
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it('posts a template message with a document header and body params to the Graph API', async () => {
    const fetchImpl = mockFetchOk();

    await sendWhatsappTemplateMessage({
      to: '+1 (555) 123-4567',
      templateName: 'quotation_ready',
      languageCode: 'en_US',
      headerDocument: { link: 'https://cdn.test/q.pdf', filename: 'quotation-Q1.pdf' },
      bodyParams: ['Jane', 'Acme Travel', 'Q-1', '$100.00'],
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v23.0/123456789/messages');
    expect(options.headers.authorization).toBe('Bearer test-token');

    const body = JSON.parse(options.body);
    expect(body.to).toBe('15551234567'); // stripped to digits only
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('quotation_ready');
    expect(body.template.components).toEqual([
      { type: 'header', parameters: [{ type: 'document', document: { link: 'https://cdn.test/q.pdf', filename: 'quotation-Q1.pdf' } }] },
      { type: 'body', parameters: [
        { type: 'text', text: 'Jane' },
        { type: 'text', text: 'Acme Travel' },
        { type: 'text', text: 'Q-1' },
        { type: 'text', text: '$100.00' },
      ] },
    ]);
  });

  it('surfaces the Graph API error message and maps a 4xx response to statusCode 400', async () => {
    const fetchImpl = mockFetchError(400, { error: { message: 'Template name does not exist' } });

    await expect(
      sendWhatsappTemplateMessage({ to: '15551234567', templateName: 'missing_template', fetchImpl })
    ).rejects.toMatchObject({ statusCode: 400, message: 'Template name does not exist' });
  });

  it("maps a 401 Graph API response to statusCode 502 (bad credentials, not the caller's fault)", async () => {
    const fetchImpl = mockFetchError(401, { error: { message: 'Invalid OAuth access token' } });

    await expect(
      sendWhatsappTemplateMessage({ to: '15551234567', templateName: 'quotation_ready', fetchImpl })
    ).rejects.toMatchObject({ statusCode: 502 });
  });
});

describe('sendWhatsappTextMessage', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    setWhatsappEnv();
  });

  it('posts a free-form text message to the Graph API', async () => {
    const fetchImpl = mockFetchOk();

    await sendWhatsappTextMessage({ to: '15551234567', body: 'Thanks for reaching out!', fetchImpl });

    const [, options] = fetchImpl.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.type).toBe('text');
    expect(body.text).toEqual({ body: 'Thanks for reaching out!', preview_url: false });
  });
});
