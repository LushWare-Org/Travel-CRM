import { describe, it, expect, vi } from 'vitest';
import { overviewQuerySchema, validateQuery } from '../analytics.validators.js';

describe('overviewQuerySchema', () => {
  it('accepts each valid timeRange value', () => {
    for (const value of ['daily', 'weekly', 'monthly', 'annual']) {
      expect(overviewQuerySchema.safeParse({ timeRange: value }).success).toBe(true);
    }
  });

  it('defaults timeRange to "monthly" when omitted', () => {
    const result = overviewQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.timeRange).toBe('monthly');
  });

  it('rejects an unrecognized timeRange value', () => {
    const result = overviewQuerySchema.safeParse({ timeRange: 'lifetime' });
    expect(result.success).toBe(false);
  });
});

describe('validateQuery middleware', () => {
  const middleware = validateQuery(overviewQuerySchema);

  it('calls next() and normalizes req.query on valid input', () => {
    const req = { query: { timeRange: 'weekly' } };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.query).toEqual({ timeRange: 'weekly' });
  });

  it('reports a 400 validation error through next() without writing a response', () => {
    // The body is the central error handler's job: routing through it is what
    // gives this response the same code and requestId as every other service's.
    const req = { query: { timeRange: 'not-a-range' } };
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) };
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.errors).toEqual([{ field: 'timeRange', message: expect.any(String) }]);
  });
});
