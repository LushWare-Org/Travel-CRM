import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { apiEnvelope } from '../src/envelope.js';

describe('apiEnvelope', () => {
  it('parses a flat { success, data } response', () => {
    const schema = apiEnvelope(z.array(z.string()));
    const result = schema.parse({ success: true, data: ['a', 'b'] });
    expect(result.data).toEqual(['a', 'b']);
  });

  it('rejects a nested data.data envelope', () => {
    const schema = apiEnvelope(z.array(z.string()));
    expect(() => schema.parse({ success: true, data: { data: ['a'] } })).toThrow();
  });
});
