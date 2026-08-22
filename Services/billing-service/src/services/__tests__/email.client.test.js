import { describe, it, expect, vi } from 'vitest';
import { sendEmail } from '../email.client.js';

describe('email.client sendEmail', () => {
  it('POSTs to notification-service with the internal token header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { messageId: 'm1' } }) });

    const result = await sendEmail({ to: 'a@test.com', subject: 'Hi', html: '<p>hi</p>', text: 'hi', fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain('/api/v1/notifications/internal/email');
    expect(options.method).toBe('POST');
    expect(options.headers['x-internal-token']).toBeTypeOf('string');
    expect(JSON.parse(options.body)).toMatchObject({ to: 'a@test.com', subject: 'Hi', html: '<p>hi</p>', text: 'hi' });
    expect(result).toEqual({ success: true, data: { messageId: 'm1' } });
  });

  it('throws when notification-service responds with a non-ok status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    await expect(sendEmail({ to: 'a@test.com', subject: 'Hi', html: '<p>hi</p>', fetchImpl }))
      .rejects.toThrow('Failed to send email via notification-service (status 503)');
  });
});
