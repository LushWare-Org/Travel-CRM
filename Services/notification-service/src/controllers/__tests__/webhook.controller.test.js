import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetLeadData, mockMapFacebookLeadToLead, mockSubmitFacebookLead, mockLoggerInfo } = vi.hoisted(() => ({
  mockGetLeadData: vi.fn(),
  mockMapFacebookLeadToLead: vi.fn(),
  mockSubmitFacebookLead: vi.fn(),
  mockLoggerInfo: vi.fn(),
}));

vi.mock('../../utils/facebook.js', () => ({
  verifyWebhookSignature: vi.fn(() => true),
  getLeadData: mockGetLeadData,
  mapFacebookLeadToLead: mockMapFacebookLeadToLead,
}));

vi.mock('../../services/lead.client.js', () => ({
  submitFacebookLead: mockSubmitFacebookLead,
}));

vi.mock('../../config/logger.js', () => ({
  default: { info: mockLoggerInfo, warn: vi.fn(), error: vi.fn() },
}));

const { handleLeadWebhook } = await import('../webhook.controller.js');

function buildReqRes(body) {
  const req = { body, get: () => null, log: { error: vi.fn() } };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req, res };
}

beforeEach(() => {
  mockGetLeadData.mockReset();
  mockMapFacebookLeadToLead.mockReset();
  mockSubmitFacebookLead.mockReset();
  mockLoggerInfo.mockReset();
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'test-token';
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
