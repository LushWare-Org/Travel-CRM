import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notifyRepsOfCallback } from '../notify.service.js';

const REPS = [
  { id: 'u1', name: 'Shalini', email: 'shalini@test.com' },
  { id: 'u2', name: 'Kamal', email: 'kamal@test.com' },
];

const call = (over = {}) => ({
  fromNumber: '94771234567',
  startedAt: new Date('2026-09-10T10:00:00.000Z'),
  durationSec: 200,
  summary: 'Wants Maldives in December.',
  ...over,
});

let calls;

function stubFetch({ reps = REPS, emailOk = true, repsOk = true } = {}) {
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
    calls.push({ url: String(url), opts });
    if (String(url).includes('notify-targets')) {
      return repsOk
        ? { ok: true, status: 200, json: async () => ({ status: 'success', data: { reps } }) }
        : { ok: false, status: 500, json: async () => ({}) };
    }
    return emailOk
      ? { ok: true, status: 200, json: async () => ({ success: true }) }
      : { ok: false, status: 502, json: async () => ({}) };
  }));
}

const emailBody = () => JSON.parse(calls.find((c) => c.url.includes('/internal/email')).opts.body);

beforeEach(() => {
  process.env.INTERNAL_SERVICE_KEY = 'svc-key';
  process.env.INTERNAL_EVENTS_TOKEN = 'evt-token';
  process.env.USER_SERVICE_URL = 'http://user.test';
  process.env.NOTIFICATION_SERVICE_URL = 'http://notify.test';
  process.env.MANAGEMENT_URL = 'http://manage.test';
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('notifyRepsOfCallback', () => {
  it('emails every active sales rep', async () => {
    stubFetch();
    const res = await notifyRepsOfCallback({ call: call(), slots: {}, leadId: 'lead-1' });
    expect(res.notified).toBe(2);
    expect(emailBody().to).toEqual(['shalini@test.com', 'kamal@test.com']);
  });

  it('names the destination in the subject so a rep can triage from the inbox', async () => {
    stubFetch();
    await notifyRepsOfCallback({ call: call(), slots: { destination: 'Maldives' }, leadId: 'l' });
    expect(emailBody().subject).toBe('Callback needed — Maldives enquiry');
  });

  it('falls back to a generic subject when no destination was captured', async () => {
    stubFetch();
    await notifyRepsOfCallback({ call: call(), slots: {}, leadId: 'l' });
    expect(emailBody().subject).toBe('Callback needed — voice agent call');
  });

  it('includes the AI summary so the rep knows the call before opening it', async () => {
    stubFetch();
    await notifyRepsOfCallback({ call: call(), slots: {}, leadId: 'l' });
    expect(emailBody().html).toContain('Wants Maldives in December.');
  });

  it('links straight to the lead in Management', async () => {
    stubFetch();
    await notifyRepsOfCallback({ call: call(), slots: {}, leadId: 'lead-9' });
    expect(emailBody().html).toContain('http://manage.test/leads?lead=lead-9');
  });

  it('still sends without a link when Management has no configured URL', async () => {
    delete process.env.MANAGEMENT_URL;
    stubFetch();
    await notifyRepsOfCallback({ call: call(), slots: {}, leadId: 'l' });
    expect(emailBody().html).not.toContain('Open the lead');
  });

  it('masks the caller number rather than mailing it to several inboxes', async () => {
    stubFetch();
    await notifyRepsOfCallback({ call: call(), slots: {}, leadId: 'l' });
    const html = emailBody().html;
    expect(html).not.toContain('94771234567');
    expect(html).toContain('***4567');
  });

  it('escapes captured text so a caller cannot inject markup into the email', async () => {
    stubFetch();
    await notifyRepsOfCallback({
      call: call({ summary: '<script>alert(1)</script>' }),
      slots: { destination: '<img src=x onerror=alert(1)>' },
      leadId: 'l',
    });
    const html = emailBody().html;
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
  });

  it('sends the internal token, never a user credential', async () => {
    stubFetch();
    await notifyRepsOfCallback({ call: call(), slots: {}, leadId: 'l' });
    const emailCall = calls.find((c) => c.url.includes('/internal/email'));
    expect(emailCall.opts.headers['x-internal-token']).toBe('evt-token');
    expect(emailCall.opts.headers.authorization).toBeUndefined();
  });

  it('sends no email when there are no active reps', async () => {
    stubFetch({ reps: [] });
    const res = await notifyRepsOfCallback({ call: call(), slots: {}, leadId: 'l' }, { warn: vi.fn() });
    expect(res.notified).toBe(0);
    expect(calls.some((c) => c.url.includes('/internal/email'))).toBe(false);
  });

  it('reports a failure when the rep lookup is unavailable', async () => {
    stubFetch({ repsOk: false });
    await expect(notifyRepsOfCallback({ call: call(), slots: {}, leadId: 'l' })).rejects.toThrow();
  });

  it('reports a failure when the email cannot be delivered', async () => {
    stubFetch({ emailOk: false });
    await expect(notifyRepsOfCallback({ call: call(), slots: {}, leadId: 'l' })).rejects.toThrow();
  });

  it('refuses to run without an internal service key', async () => {
    delete process.env.INTERNAL_SERVICE_KEY;
    stubFetch();
    await expect(notifyRepsOfCallback({ call: call(), slots: {}, leadId: 'l' }))
      .rejects.toThrow(/INTERNAL_SERVICE_KEY/);
  });
});
