import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { symmetric } from 'retell-sdk/lib/webhook_auth.js';

const SECRET = 'test-secret';
process.env.RETELL_WEBHOOK_SECRET = SECRET;

const mockVoiceNumberFindFirst = vi.fn();
const mockVoiceCallCreate = vi.fn();
const mockVoiceCallUpdate = vi.fn();
const mockVoiceCallFindFirst = vi.fn();
const mockVoiceCallCount = vi.fn();

vi.mock('../../db/client.js', () => ({
  default: {
    voiceNumber: { findFirst: (...a) => mockVoiceNumberFindFirst(...a) },
    voiceCall: {
      create: (...a) => mockVoiceCallCreate(...a),
      update: (...a) => mockVoiceCallUpdate(...a),
      findFirst: (...a) => mockVoiceCallFindFirst(...a),
      count: (...a) => mockVoiceCallCount(...a),
    },
  },
}));

const mockLookup = vi.fn();
const mockSubmitIntake = vi.fn();
vi.mock('../../services/lead.client.js', () => ({
  lookupLeadsByPhone: (...a) => mockLookup(...a),
  submitIntake: (...a) => mockSubmitIntake(...a),
  logCallCommunication: vi.fn(),
}));

const mockNotify = vi.fn();
vi.mock('../../services/notify.service.js', () => ({
  notifyRepsOfCallback: (...a) => mockNotify(...a),
}));

const { default: app } = await import('../../app.js');

// Retell's real format is `v=<timestamp>,d=<hmac of body+timestamp>`, so these
// tests use the SDK's own signer rather than a hand-rolled HMAC over the body.
const sign = (raw, secret = SECRET) => symmetric.sign(raw, secret);

const post = async (path, body, { secret = SECRET, signature } = {}) => {
  const raw = JSON.stringify(body);
  return request(app)
    .post(path)
    .set('content-type', 'application/json')
    .set('x-retell-signature', signature ?? (await sign(raw, secret)))
    .send(raw);
};

const inboundBody = (over = {}) => ({
  event: 'call_inbound',
  call_inbound: { from_number: '+94771234567', to_number: '+94112223333', ...over },
});

const postCallBody = (over = {}) => ({
  event: 'call_analyzed',
  call: {
    call_id: 'call_abc123',
    direction: 'inbound',
    from_number: '+94771234567',
    to_number: '+94112223333',
    duration_ms: 240000,
    transcript_object: [
      { role: 'agent', content: 'Thanks for calling.' },
      { role: 'user', content: 'I want to go to the Maldives in December.' },
    ],
    call_analysis: { call_summary: 'New Maldives enquiry', user_sentiment: 'Positive' },
    ...over,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RETELL_WEBHOOK_SECRET = SECRET;
  mockVoiceNumberFindFirst.mockResolvedValue({
    id: 'num-1', e164: '94112223333', retellAgentId: 'agent_live', label: 'Lushware Travel',
    disclosureText: 'This call is recorded.',
  });
  mockVoiceCallCreate.mockResolvedValue({ id: 'vc-1', leadId: null });
  mockVoiceCallUpdate.mockResolvedValue({ id: 'vc-1' });
  mockVoiceCallFindFirst.mockResolvedValue(null);
  mockVoiceCallCount.mockResolvedValue(0); // well under the daily cap by default
  mockLookup.mockResolvedValue({ count: 0, matches: [] });
  mockSubmitIntake.mockResolvedValue({ leadId: 'lead-9', created: true });
  mockNotify.mockResolvedValue({ notified: 2 });
});

afterAll(() => { delete process.env.RETELL_WEBHOOK_SECRET; });

describe('POST /api/v1/webhooks/voice/inbound', () => {
  it('rejects an unsigned request with 401', async () => {
    const res = await request(app).post('/api/v1/webhooks/voice/inbound').send(inboundBody());
    expect(res.status).toBe(401);
  });

  it('rejects a request signed with the wrong secret with 401', async () => {
    const res = await post('/api/v1/webhooks/voice/inbound', inboundBody(), { secret: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns the agent id mapped to the dialled number', async () => {
    const res = await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(res.body.call_inbound.override_agent_id).toBe('agent_live');
  });

  it('looks the number up by its digits-only form', async () => {
    await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(mockVoiceNumberFindFirst).toHaveBeenCalledWith({
      where: { e164: '94112223333', isActive: true },
    });
  });

  it('returns 404 when the dialled number is not configured', async () => {
    mockVoiceNumberFindFirst.mockResolvedValue(null);
    const res = await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(res.status).toBe(404);
  });

  it('marks an unrecognised caller as not known', async () => {
    const res = await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(res.body.call_inbound.dynamic_variables.caller_known).toBe('false');
  });

  it('greets a single-match caller by first name', async () => {
    mockLookup.mockResolvedValue({
      count: 1,
      matches: [{ leadId: 'lead-1', firstName: 'Nimal', statusClass: 'quote_sent', destination: 'Maldives' }],
    });
    const res = await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(res.body.call_inbound.dynamic_variables.caller_name).toBe('Nimal');
  });

  it('records the matched leadId on the call', async () => {
    mockLookup.mockResolvedValue({
      count: 1,
      matches: [{ leadId: 'lead-1', firstName: 'Nimal', statusClass: 'quote_sent', destination: 'Maldives' }],
    });
    await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(mockVoiceCallCreate.mock.calls[0][0].data.leadId).toBe('lead-1');
  });

  it('withholds the caller name when two leads share the number', async () => {
    mockLookup.mockResolvedValue({
      count: 2,
      matches: [
        { leadId: 'lead-1', firstName: 'Nimal', statusClass: 'quote_sent' },
        { leadId: 'lead-2', firstName: 'Kamal', statusClass: 'confirmed' },
      ],
    });
    const res = await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(res.body.call_inbound.dynamic_variables.caller_name).toBe('');
  });

  it('records an ambiguous match outcome when two leads share the number', async () => {
    mockLookup.mockResolvedValue({
      count: 2,
      matches: [{ leadId: 'lead-1', firstName: 'Nimal' }, { leadId: 'lead-2', firstName: 'Kamal' }],
    });
    await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(mockVoiceCallCreate.mock.calls[0][0].data.matchOutcome).toBe('AMBIGUOUS');
  });

  it('still answers the call when the caller lookup fails', async () => {
    mockLookup.mockRejectedValue(new Error('lead-service down'));
    const res = await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(res.status).toBe(200);
    expect(res.body.call_inbound.dynamic_variables.caller_known).toBe('false');
  });

  it('never exposes a leadId in the dynamic variables', async () => {
    mockLookup.mockResolvedValue({
      count: 1, matches: [{ leadId: 'lead-secret', firstName: 'Nimal', statusClass: 'quote_sent' }],
    });
    const res = await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(JSON.stringify(res.body.call_inbound.dynamic_variables)).not.toContain('lead-secret');
  });

  it('rejects a payload missing the caller number with 400', async () => {
    const res = await post('/api/v1/webhooks/voice/inbound', { call_inbound: { to_number: '+94112223333' } });
    expect(res.status).toBe(400);
  });

  it('skips the caller lookup once a number is over its daily call cap', async () => {
    mockVoiceCallCount.mockResolvedValue(20); // == the default cap
    await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it('still answers the call for a number over its daily call cap', async () => {
    mockVoiceCallCount.mockResolvedValue(20);
    const res = await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(res.status).toBe(200);
    expect(res.body.call_inbound.override_agent_id).toBe('agent_live');
  });

  it('treats a caller over the daily call cap as unknown', async () => {
    mockVoiceCallCount.mockResolvedValue(20);
    const res = await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(res.body.call_inbound.dynamic_variables.caller_known).toBe('false');
  });

  it('still performs the lookup for a number one call under the cap', async () => {
    mockVoiceCallCount.mockResolvedValue(19);
    await post('/api/v1/webhooks/voice/inbound', inboundBody());
    expect(mockLookup).toHaveBeenCalled();
  });
});

describe('POST /api/v1/webhooks/voice/post-call', () => {
  it('rejects an unsigned request with 401', async () => {
    const res = await request(app).post('/api/v1/webhooks/voice/post-call').send(postCallBody());
    expect(res.status).toBe(401);
  });

  it('stores the call under its Retell call id', async () => {
    await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(mockVoiceCallCreate.mock.calls[0][0].data.retellCallId).toBe('call_abc123');
  });

  it('converts the duration from milliseconds to seconds', async () => {
    await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(mockVoiceCallCreate.mock.calls[0][0].data.durationSec).toBe(240);
  });

  it('stores the AI summary', async () => {
    await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(mockVoiceCallCreate.mock.calls[0][0].data.summary).toBe('New Maldives enquiry');
  });

  it('marks a call with no transcript as abandoned', async () => {
    await post('/api/v1/webhooks/voice/post-call', postCallBody({ transcript_object: [] }));
    expect(mockVoiceCallCreate.mock.calls[0][0].data.disposition).toBe('ABANDONED');
  });

  it('submits intake on the voice channel keyed by the call id', async () => {
    await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(mockSubmitIntake.mock.calls[0][0]).toMatchObject({
      channel: 'voice',
      sessionId: 'call_abc123',
      contact: { phone: '94771234567' },
    });
  });

  it('passes the extracted destination through to intake', async () => {
    await post('/api/v1/webhooks/voice/post-call', postCallBody({
      call_analysis: { call_summary: 's', custom_analysis_data: { destination: 'Maldives', travelers: 2 } },
    }));
    expect(mockSubmitIntake.mock.calls[0][0].slots).toEqual({ destination: 'Maldives', travelers: 2 });
  });

  it('drops an out-of-range traveller count rather than sending it to intake', async () => {
    await post('/api/v1/webhooks/voice/post-call', postCallBody({
      call_analysis: { call_summary: 's', custom_analysis_data: { travelers: 900 } },
    }));
    expect(mockSubmitIntake.mock.calls[0][0].slots).toEqual({});
  });

  it('skips intake for a call with no transcript', async () => {
    await post('/api/v1/webhooks/voice/post-call', postCallBody({ transcript_object: [] }));
    expect(mockSubmitIntake).not.toHaveBeenCalled();
  });

  it('links the call to the lead intake created', async () => {
    await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(mockVoiceCallUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ leadId: 'lead-9' }),
    }));
  });

  it('flags the call for a rep when the agent left something unresolved', async () => {
    await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(mockVoiceCallUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ needsRepFollowup: true }),
    }));
  });

  it('does not flag a call the agent reported as fully resolved', async () => {
    const body = postCallBody();
    body.call.call_analysis.custom_analysis_data = { needs_rep_followup: false };
    await post('/api/v1/webhooks/voice/post-call', body);
    expect(mockVoiceCallUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ needsRepFollowup: false }),
    }));
  });

  it('still acknowledges the webhook when intake fails', async () => {
    mockSubmitIntake.mockRejectedValue(new Error('lead-service down'));
    const res = await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it('updates the existing in-progress row rather than creating a second call', async () => {
    mockVoiceCallFindFirst.mockResolvedValue({ id: 'vc-existing', leadId: null });
    await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(mockVoiceCallCreate).not.toHaveBeenCalled();
    expect(mockVoiceCallUpdate.mock.calls[0][0].where).toEqual({ id: 'vc-existing' });
  });

  describe('call_started event', () => {
    const callStartedBody = () => ({
      event: 'call_started',
      call: {
        call_id: 'call_abc123',
        direction: 'inbound',
        from_number: '+94771234567',
        to_number: '+94112223333',
        transcript_object: [],
      },
    });

    it('adopts the pending row’s real call id as soon as it is known', async () => {
      mockVoiceCallFindFirst.mockResolvedValue({ id: 'vc-pending', retellCallId: 'pending:x:y:1' });
      await post('/api/v1/webhooks/voice/post-call', callStartedBody());
      expect(mockVoiceCallUpdate).toHaveBeenCalledWith({
        where: { id: 'vc-pending' },
        data: { retellCallId: 'call_abc123' },
      });
    });

    it('does not run the full post-call pipeline for a call_started event', async () => {
      mockVoiceCallFindFirst.mockResolvedValue({ id: 'vc-pending', retellCallId: 'pending:x:y:1' });
      await post('/api/v1/webhooks/voice/post-call', callStartedBody());
      expect(mockSubmitIntake).not.toHaveBeenCalled();
      expect(mockNotify).not.toHaveBeenCalled();
      expect(mockVoiceCallCreate).not.toHaveBeenCalled();
    });

    it('does not re-adopt a call already carrying its real id', async () => {
      mockVoiceCallFindFirst.mockResolvedValue({ id: 'vc-real', retellCallId: 'call_abc123' });
      await post('/api/v1/webhooks/voice/post-call', callStartedBody());
      expect(mockVoiceCallUpdate).not.toHaveBeenCalled();
    });

    it('acknowledges the webhook even when no pending row is found yet', async () => {
      mockVoiceCallFindFirst.mockResolvedValue(null);
      const res = await post('/api/v1/webhooks/voice/post-call', callStartedBody());
      expect(res.status).toBe(200);
      expect(mockVoiceCallUpdate).not.toHaveBeenCalled();
    });
  });

  it('rejects a payload with no call id with 400', async () => {
    const res = await post('/api/v1/webhooks/voice/post-call', { call: { from_number: '+94771234567' } });
    expect(res.status).toBe(400);
  });

  it('does not submit lead intake once a number is over its daily call cap', async () => {
    mockVoiceCallCount.mockResolvedValue(20);
    await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(mockSubmitIntake).not.toHaveBeenCalled();
  });

  it('does not notify the team once a number is over its daily call cap', async () => {
    mockVoiceCallCount.mockResolvedValue(20);
    await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('still records the call itself even when the number is over its daily cap', async () => {
    mockVoiceCallCount.mockResolvedValue(20);
    await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(mockVoiceCallCreate.mock.calls[0][0].data.retellCallId).toBe('call_abc123');
  });

  it('still acknowledges the webhook for a number over its daily cap', async () => {
    mockVoiceCallCount.mockResolvedValue(20);
    const res = await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it('still submits intake for a number one call under the cap', async () => {
    mockVoiceCallCount.mockResolvedValue(19);
    await post('/api/v1/webhooks/voice/post-call', postCallBody());
    expect(mockSubmitIntake).toHaveBeenCalled();
  });
});
