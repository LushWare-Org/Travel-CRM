import { describe, it, expect } from 'vitest';
import {
  LeadIntakeContact,
  LeadIntakeTranscriptMessage,
  LeadIntakeRequest,
  LeadIntakeResult,
  LeadClaimResult,
} from '../src/leadIntake.js';

describe('LeadIntakeContact', () => {
  it('rejects a contact with no email, phone, or whatsapp', () => {
    expect(() => LeadIntakeRequest.parse({
      channel: 'chatbot',
      sessionId: 'sess-1',
      contact: {},
      transcript: [{ id: 'm1', role: 'user', content: 'hi', at: new Date().toISOString() }],
    })).toThrow();
  });

  it('accepts a contact with only a phone number', () => {
    expect(LeadIntakeContact.parse({ phone: '+15551234567' })).toEqual({ phone: '+15551234567' });
  });
});

describe('LeadIntakeTranscriptMessage', () => {
  it('requires id, role, content, and at', () => {
    expect(() => LeadIntakeTranscriptMessage.parse({ role: 'user', content: 'hi' })).toThrow();
  });

  it('rejects a non-ISO at timestamp', () => {
    expect(() => LeadIntakeTranscriptMessage.parse({ id: 'm1', role: 'user', content: 'hi', at: 'not-a-date' })).toThrow();
  });
});

describe('LeadIntakeRequest', () => {
  const validTranscript = [{ id: 'm1', role: 'user', content: 'I want a trip to Bali', at: new Date().toISOString() }];

  it('parses a valid request with slots and contact', () => {
    const req = {
      channel: 'chatbot',
      sessionId: 'sess-1',
      contact: { email: 'a@b.com' },
      slots: { destination: 'Bali', duration: 5 },
      transcript: validTranscript,
    };
    expect(LeadIntakeRequest.parse(req)).toEqual(req);
  });

  it('rejects an unknown channel', () => {
    expect(() => LeadIntakeRequest.parse({
      channel: 'whatsapp',
      sessionId: 'sess-1',
      contact: { email: 'a@b.com' },
      transcript: validTranscript,
    })).toThrow();
  });

  it('rejects an empty transcript', () => {
    expect(() => LeadIntakeRequest.parse({
      channel: 'chatbot',
      sessionId: 'sess-1',
      contact: { email: 'a@b.com' },
      transcript: [],
    })).toThrow();
  });

  it('rejects a 41-message transcript (over the max(40) cap)', () => {
    const transcript = Array.from({ length: 41 }, (_, i) => ({
      id: `m${i}`, role: 'user', content: 'hi', at: new Date().toISOString(),
    }));
    expect(() => LeadIntakeRequest.parse({
      channel: 'chatbot', sessionId: 'sess-1', contact: { email: 'a@b.com' }, transcript,
    })).toThrow();
  });
});

describe('LeadIntakeResult', () => {
  it('parses a valid result', () => {
    const result = { leadId: 'lead-1', lifecycleStatus: 'PENDING_VERIFICATION', created: true };
    expect(LeadIntakeResult.parse(result)).toEqual(result);
  });
});

describe('LeadClaimResult', () => {
  it('parses a valid claim result', () => {
    const result = { id: 'lead-1', lifecycleStatus: 'NEW', assignedToId: 'user-1' };
    expect(LeadClaimResult.parse(result)).toEqual(result);
  });
});
