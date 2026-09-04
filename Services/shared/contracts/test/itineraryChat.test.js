import { describe, it, expect } from 'vitest';
import { ItineraryChatMessage, ItineraryChatSlots, ItineraryChatRequest, ItineraryChatResult } from '../src/itineraryChat.js';

describe('ItineraryChatMessage', () => {
  it('parses a valid user message', () => {
    expect(ItineraryChatMessage.parse({ role: 'user', content: 'Hi there' })).toEqual({ role: 'user', content: 'Hi there' });
  });

  it('rejects an invalid role', () => {
    expect(() => ItineraryChatMessage.parse({ role: 'system', content: 'Hi' })).toThrow();
  });
});

describe('ItineraryChatRequest', () => {
  const baseMessages = [{ role: 'user', content: 'I want to go to Kandy' }];

  it('parses a valid request with slots', () => {
    const req = { messages: baseMessages, slots: { destination: 'Kandy' } };
    expect(ItineraryChatRequest.parse(req)).toEqual(req);
  });

  it('parses a valid request with no slots', () => {
    const req = { messages: baseMessages };
    expect(ItineraryChatRequest.parse(req)).toEqual(req);
  });

  it('rejects messages: []', () => {
    expect(() => ItineraryChatRequest.parse({ messages: [] })).toThrow();
  });

  it('rejects a 21-message array (over the max(20) cap)', () => {
    const messages = Array.from({ length: 21 }, () => ({ role: 'user', content: 'hi' }));
    expect(() => ItineraryChatRequest.parse({ messages })).toThrow();
  });

  it('rejects an invalid role', () => {
    const messages = [{ role: 'system', content: 'hi' }];
    expect(() => ItineraryChatRequest.parse({ messages })).toThrow();
  });
});

describe('ItineraryChatResult', () => {
  it('parses a valid result', () => {
    const result = { reply: 'Sounds great!', slots: { destination: 'Kandy', duration: 3 }, readyToGenerate: true };
    expect(ItineraryChatResult.parse(result)).toEqual(result);
  });

  it('rejects a result missing reply', () => {
    expect(() => ItineraryChatResult.parse({ slots: {}, readyToGenerate: false })).toThrow();
  });

  it('rejects slots.duration: 31 (out of the reused 1-30 bound)', () => {
    const result = { reply: 'Sounds great!', slots: { duration: 31 }, readyToGenerate: false };
    expect(() => ItineraryChatResult.parse(result)).toThrow();
  });
});

describe('ItineraryChatSlots', () => {
  it('is a partial of GenerateItineraryPreviewRequest — all fields optional', () => {
    expect(ItineraryChatSlots.parse({})).toEqual({});
  });
});
