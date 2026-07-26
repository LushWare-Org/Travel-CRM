import { describe, it, expect, vi } from 'vitest';
import errorHandler from '../errorHandler.js';

describe('errorHandler', () => {
  const res = () => {
    const r = {};
    r.status = vi.fn().mockReturnValue(r);
    r.json = vi.fn().mockReturnValue(r);
    return r;
  };

  it('should return JSON with the error message and status code', () => {
    const err = { statusCode: 400, message: 'Bad input', status: 'fail' };
    const response = res();

    errorHandler(err, {}, response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'Bad input',
    });
  });

  it('should default to 500 when statusCode is missing', () => {
    const err = { message: 'Unknown error' };
    const response = res();

    errorHandler(err, {}, response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json.mock.calls[0][0].status).toBe('error');
  });

  it('should default status to "error" when missing', () => {
    const err = { statusCode: 502, message: 'Gateway error' };
    const response = res();

    errorHandler(err, {}, response, vi.fn());

    expect(response.json.mock.calls[0][0].status).toBe('error');
  });

  it('should include stack trace in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const err = { statusCode: 500, message: 'Boom', stack: 'trace...' };
    const response = res();

    errorHandler(err, {}, response, vi.fn());

    expect(response.json.mock.calls[0][0].stack).toBe('trace...');
    process.env.NODE_ENV = originalEnv;
  });
});
