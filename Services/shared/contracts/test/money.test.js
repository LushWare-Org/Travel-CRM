import { describe, it, expect } from 'vitest';
import { moneyField } from '../src/money.js';

describe('moneyField', () => {
  it('coerces a Decimal-as-string value to a number', () => {
    expect(moneyField.parse('1250.50')).toBe(1250.5);
  });

  it('accepts a plain number unchanged', () => {
    expect(moneyField.parse(42)).toBe(42);
  });

  it('rejects a non-numeric string', () => {
    expect(() => moneyField.parse('not-a-number')).toThrow();
  });
});
