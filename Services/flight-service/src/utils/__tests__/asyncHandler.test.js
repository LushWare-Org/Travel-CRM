import { describe, it, expect, vi } from 'vitest';
import asyncHandler from '../asyncHandler.js';

describe('asyncHandler', () => {
  it('should call the wrapped function with req, res, next', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const handler = asyncHandler(fn);
    const req = {};
    const res = {};
    const next = vi.fn();

    await handler(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('should catch rejected promises and forward to next()', async () => {
    const error = new Error('async failure');
    const fn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(fn);
    const next = vi.fn();

    await handler({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should pass through resolved value', async () => {
    const fn = vi.fn(async (req, res) => {
      res.statusCode = 200;
      res.body = { done: true };
    });
    const handler = asyncHandler(fn);
    const res = {};

    await handler({}, res, vi.fn());

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ done: true });
  });
});
