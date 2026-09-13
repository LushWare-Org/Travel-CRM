import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetLeadData, mockMapFacebookLeadToLead, mockSubmitFacebookLead,
  mockLogWhatsappCommunication, mockLoggerInfo,
} = vi.hoisted(() => ({
  mockGetLeadData: vi.fn(),
  mockMapFacebookLeadToLead: vi.fn(),
  mockSubmitFacebookLead: vi.fn(),
  mockLogWhatsappCommunication: vi.fn(),
  mockLoggerInfo: vi.fn(),
}));

vi.mock('../../utils/facebook.js', () => ({
  verifyWebhookSignature: vi.fn(() => true),
  getLeadData: mockGetLeadData,
  mapFacebookLeadToLead: mockMapFacebookLeadToLead,
}));

vi.mock('../../services/lead.client.js', () => ({
  submitFacebookLead: mockSubmitFacebookLead,
  logWhatsappCommunication: mockLogWhatsappCommunication,
}));

vi.mock('../../config/logger.js', () => ({
  default: { info: mockLoggerInfo, warn: vi.fn(), error: vi.fn() },
}));

const { handleLeadWebhook, verifyWhatsappWebhook, handleWhatsappWebhook } = await import('../webhook.controller.js');

function buildReqRes(body) {
  const req = { body, get: () => null, log: { error: vi.fn() } };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req, res };
}

beforeEach(() => {
  mockGetLeadData.mockReset();
  mockMapFacebookLeadToLead.mockReset();
  mockSubmitFacebookLead.mockReset();
  mockLogWhatsappCommunication.mockReset();
  mockLoggerInfo.mockReset();
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'test-token';
  process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token';
  process.env.NODE_ENV = 'test';
});

describe('handleLeadWebhook — Facebook Lead Ads processing', () => {
  it('hands the mapped lead to lead-service instead of writing to crm_leads tables directly', async () => {
    mockGetLeadData.mockResolvedValue({ field_data: [] });
    mockMapFacebookLeadToLead.mockReturnValue({
      name: 'Jane Doe', email: 'jane@test.com', phone: '123', message: 'Hi',
    });
    mockSubmitFacebookLead.mockResolvedValue({ data: { leadId: 'lead-1', duplicate: false } });

    const { req, res } = buildReqRes({
      entry: [{ changes: [{ value: { leadgen_id: 'fb-lead-1' } }] }],
    });
    await handleLeadWebhook(req, res, vi.fn());
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockSubmitFacebookLead).toHaveBeenCalledWith(expect.objectContaining({
      leadgenId: 'fb-lead-1', email: 'jane@test.com', phone: '123',
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('logs a duplicate instead of throwing when lead-service reports the lead already exists', async () => {
    mockGetLeadData.mockResolvedValue({ field_data: [] });
    mockMapFacebookLeadToLead.mockReturnValue({ name: 'Jane Doe', email: 'jane@test.com', phone: '123' });
    mockSubmitFacebookLead.mockResolvedValue({ data: { leadId: 'lead-existing', duplicate: true } });

    const { req, res } = buildReqRes({
      entry: [{ changes: [{ value: { leadgen_id: 'fb-lead-2' } }] }],
    });
    await handleLeadWebhook(req, res, vi.fn());
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockSubmitFacebookLead).toHaveBeenCalledTimes(1);
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({ leadgenId: 'fb-lead-2' }),
      expect.stringMatching(/duplicate/i)
    );
  });
});

function buildVerifyReqRes(query) {
  const req = { query, log: { info: vi.fn() } };
  const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
  return { req, res };
}

function buildWhatsappWebhookReqRes(body) {
  const req = { body, get: () => null, log: { error: vi.fn() } };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req, res };
}

describe('verifyWhatsappWebhook — Meta subscription handshake', () => {
  it('echoes hub.challenge when mode and token match', async () => {
    const { req, res } = buildVerifyReqRes({
      'hub.mode': 'subscribe', 'hub.verify_token': 'test-verify-token', 'hub.challenge': 'echo-me',
    });
    await verifyWhatsappWebhook(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('echo-me');
  });

  it('rejects a mismatched verify token', async () => {
    const { req, res } = buildVerifyReqRes({
      'hub.mode': 'subscribe', 'hub.verify_token': 'wrong-token', 'hub.challenge': 'echo-me',
    });
    const next = vi.fn();
    await verifyWhatsappWebhook(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(res.send).not.toHaveBeenCalled();
  });
});

describe('handleWhatsappWebhook — inbound messages and status callbacks', () => {
  it('logs an inbound customer message against the sender phone number', async () => {
    mockLogWhatsappCommunication.mockResolvedValue({ matched: true });

    const { req, res } = buildWhatsappWebhookReqRes({
      entry: [{ changes: [{ value: {
        messages: [{ from: '15551234567', type: 'text', text: { body: 'When does the trip start?' }, timestamp: '1700000000' }],
      } }] }],
    });
    await handleWhatsappWebhook(req, res, vi.fn());
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockLogWhatsappCommunication).toHaveBeenCalledWith(expect.objectContaining({
      phone: '15551234567',
      notes: expect.stringContaining('When does the trip start?'),
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('logs a delivery-status callback against the recipient phone number', async () => {
    mockLogWhatsappCommunication.mockResolvedValue({ matched: true });

    const { req, res } = buildWhatsappWebhookReqRes({
      entry: [{ changes: [{ value: {
        statuses: [{ recipient_id: '15557654321', status: 'delivered', timestamp: '1700000001' }],
      } }] }],
    });
    await handleWhatsappWebhook(req, res, vi.fn());
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockLogWhatsappCommunication).toHaveBeenCalledWith(expect.objectContaining({
      phone: '15557654321',
      notes: expect.stringContaining('delivered'),
    }));
  });

  it('responds 200 immediately without waiting for the lead-service call to resolve', async () => {
    let resolveLog;
    mockLogWhatsappCommunication.mockReturnValue(new Promise((resolve) => { resolveLog = resolve; }));

    const { req, res } = buildWhatsappWebhookReqRes({
      entry: [{ changes: [{ value: { messages: [{ from: '15551234567', type: 'text', text: { body: 'hi' } }] } }] }],
    });
    await handleWhatsappWebhook(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    resolveLog({ matched: true });
  });
});
