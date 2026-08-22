import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { mockSendEmail } = vi.hoisted(() => ({ mockSendEmail: vi.fn() }));

vi.mock('../../utils/email.js', () => ({
  sendEmail: mockSendEmail,
  isEmailConfigured: vi.fn(),
}));

const { default: notificationRoutes } = await import('../notification.routes.js');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use((req, res, next) => {
    req.log = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
    next();
  });
  app.use('/api/v1/notifications', notificationRoutes);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  });
  return app;
}

const VALID_TOKEN = 'test-internal-token';
const PAYLOAD = { to: 'customer@test.com', subject: 'Hello', html: '<p>Hi</p>' };

describe('POST /api/v1/notifications/internal/email', () => {
  beforeEach(() => {
    mockSendEmail.mockReset();
    process.env.INTERNAL_EVENTS_TOKEN = VALID_TOKEN;
  });

  it('rejects the request when x-internal-token is missing', async () => {
    const res = await request(buildApp()).post('/api/v1/notifications/internal/email').send(PAYLOAD);

    expect(res.status).toBe(401);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('rejects the request when x-internal-token is wrong', async () => {
    const res = await request(buildApp())
      .post('/api/v1/notifications/internal/email')
      .set('x-internal-token', 'wrong-token')
      .send(PAYLOAD);

    expect(res.status).toBe(401);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('rejects a payload missing the required "to" field', async () => {
    const res = await request(buildApp())
      .post('/api/v1/notifications/internal/email')
      .set('x-internal-token', VALID_TOKEN)
      .send({ subject: 'Hello', html: '<p>Hi</p>' });

    expect(res.status).toBe(400);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('sends the email and returns the message id on success', async () => {
    mockSendEmail.mockResolvedValue({ messageId: 'msg-123' });

    const res = await request(buildApp())
      .post('/api/v1/notifications/internal/email')
      .set('x-internal-token', VALID_TOKEN)
      .send(PAYLOAD);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { messageId: 'msg-123' } });
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'customer@test.com', subject: 'Hello', html: '<p>Hi</p>',
    }));
  });

  it('returns 503 when SMTP is not configured', async () => {
    const err = new Error('Email is not configured');
    err.statusCode = 503;
    mockSendEmail.mockRejectedValue(err);

    const res = await request(buildApp())
      .post('/api/v1/notifications/internal/email')
      .set('x-internal-token', VALID_TOKEN)
      .send(PAYLOAD);

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });

  it('returns 502 with a generic message when the SMTP send fails', async () => {
    mockSendEmail.mockRejectedValue(new Error('ECONNREFUSED: connection refused'));

    const res = await request(buildApp())
      .post('/api/v1/notifications/internal/email')
      .set('x-internal-token', VALID_TOKEN)
      .send(PAYLOAD);

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ success: false, message: 'Failed to send email' });
  });

  it('forwards a base64 PDF attachment to the transport layer', async () => {
    mockSendEmail.mockResolvedValue({ messageId: 'msg-456' });
    const attachments = [{ filename: 'quotation.pdf', contentType: 'application/pdf', contentBase64: Buffer.from('pdf-bytes').toString('base64') }];

    const res = await request(buildApp())
      .post('/api/v1/notifications/internal/email')
      .set('x-internal-token', VALID_TOKEN)
      .send({ ...PAYLOAD, attachments });

    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ attachments }));
  });
});
