import { describe, it, expect } from 'vitest';
import { normalizePhone, withNormalizedPhones, phoneMatchWhere } from '../phone.js';

describe('normalizePhone', () => {
  it('strips a leading plus from an E.164 number', () => {
    expect(normalizePhone('+94771234567')).toBe('94771234567');
  });

  it('strips spaces, dashes and parentheses', () => {
    expect(normalizePhone('+94 (77) 123-4567')).toBe('94771234567');
  });

  it('returns the same digits for the plus and no-plus forms of one number', () => {
    expect(normalizePhone('+94771234567')).toBe(normalizePhone('94771234567'));
  });

  it('returns null for null', () => {
    expect(normalizePhone(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(normalizePhone(undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(normalizePhone('')).toBeNull();
  });

  it('returns null for a string holding no digits', () => {
    expect(normalizePhone('+- ()')).toBeNull();
  });

  it('accepts a number rather than a string', () => {
    expect(normalizePhone(94771234567)).toBe('94771234567');
  });

  it('keeps unicode digits out of the result', () => {
    expect(normalizePhone('+94७७१')).toBe('94');
  });
});

describe('withNormalizedPhones', () => {
  it('adds phoneNormalized when phone is present', () => {
    expect(withNormalizedPhones({ phone: '+94771234567' })).toEqual({
      phone: '+94771234567',
      phoneNormalized: '94771234567',
    });
  });

  it('adds whatsappNormalized when whatsapp is present', () => {
    expect(withNormalizedPhones({ whatsapp: '+94771234567' })).toEqual({
      whatsapp: '+94771234567',
      whatsappNormalized: '94771234567',
    });
  });

  it('omits phoneNormalized when phone is absent from a partial update', () => {
    expect(withNormalizedPhones({ whatsapp: '0771234567' })).not.toHaveProperty('phoneNormalized');
  });

  it('sets phoneNormalized to null when phone is explicitly cleared', () => {
    expect(withNormalizedPhones({ phone: null }).phoneNormalized).toBeNull();
  });

  it('leaves unrelated fields untouched', () => {
    expect(withNormalizedPhones({ name: 'Nimal', phone: '+94771234567' }).name).toBe('Nimal');
  });

  it('does not mutate the input object', () => {
    const input = { phone: '+94771234567' };
    withNormalizedPhones(input);
    expect(input).toEqual({ phone: '+94771234567' });
  });
});

describe('phoneMatchWhere', () => {
  it('matches an E.164 input against both normalized columns', () => {
    expect(phoneMatchWhere('+94771234567')).toEqual({
      OR: [{ phoneNormalized: '94771234567' }, { whatsappNormalized: '94771234567' }],
    });
  });

  it('builds the same clause for the plus and no-plus forms', () => {
    expect(phoneMatchWhere('+94771234567')).toEqual(phoneMatchWhere('94771234567'));
  });

  it('returns null when the input holds no digits', () => {
    expect(phoneMatchWhere('n/a')).toBeNull();
  });

  it('returns null for null', () => {
    expect(phoneMatchWhere(null)).toBeNull();
  });
});
