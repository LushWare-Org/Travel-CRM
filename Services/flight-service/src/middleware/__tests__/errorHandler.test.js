import { describe, it, expect, vi } from 'vitest';
import errorHandler from '../errorHandler.js';
import AppError from '../../utils/appError.js';

// This handler is the one place a client-visible error is rendered, so these tests
// pin what a user can and cannot see. A raw message reaching the body by accident
// is the failure mode this file exists to catch.
describe('errorHandler', () => {
  const res = () => {
    const r = {};
    r.status = vi.fn().mockReturnValue(r);
    r.json = vi.fn().mockReturnValue(r);
    return r;
  };

  // A stub logger keeps the suite quiet; req.log is what the handler prefers.
  const req = (extra = {}) => ({ log: { error: vi.fn(), warn: vi.fn() }, ...extra });

  const bodyOf = (response) => response.json.mock.calls[0][0];

  it('replaces an unexpected error message with a generic one', () => {
    const response = res();

    errorHandler({ statusCode: 500, message: 'connect ECONNREFUSED 10.0.0.5:5432' }, req(), response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(500);
    const body = bodyOf(response);
    expect(body.message).toBe('Something went wrong on our side. Please try again.');
    expect(body.code).toBe('INTERNAL');
    expect(body.status).toBe('error');
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
  });

  it('replaces a non-operational 4xx message rather than showing it', () => {
    const response = res();

    errorHandler({ statusCode: 400, message: 'Bad input' }, req(), response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(400);
    const body = bodyOf(response);
    expect(body.message).toBe("We couldn't process that request. Please check the details and try again.");
    expect(body.code).toBe('BAD_REQUEST');
    expect(body.status).toBe('fail');
  });

  it('defaults to 500 and a generic message when statusCode is missing', () => {
    const response = res();

    errorHandler({ message: 'Unknown error' }, req(), response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(500);
    const body = bodyOf(response);
    expect(body.message).toBe('Something went wrong on our side. Please try again.');
    expect(body.code).toBe('INTERNAL');
  });

  it('shows an operational message verbatim and derives its code', () => {
    const response = res();

    errorHandler(new AppError('Flight booking not found', 404), req(), response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(404);
    const body = bodyOf(response);
    expect(body.message).toBe('Flight booking not found');
    expect(body.code).toBe('NOT_FOUND');
    expect(body.status).toBe('fail');
  });

  it('honours an explicit code and echoes field-level validation detail', () => {
    const response = res();
    const errors = [{ field: 'contact.email', message: 'Enter a valid email address' }];

    errorHandler(
      new AppError('Please check the highlighted fields and try again.', 400, {
        code: 'VALIDATION_FAILED',
        errors,
      }),
      req(),
      response,
      vi.fn(),
    );

    const body = bodyOf(response);
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.errors).toEqual(errors);
  });

  it('never echoes field-level detail from a non-operational error', () => {
    const response = res();

    errorHandler(
      { statusCode: 400, message: 'raw', errors: [{ field: 'x', message: 'y' }] },
      req(),
      response,
      vi.fn(),
    );

    expect(bodyOf(response).errors).toBeUndefined();
  });

  it('includes the request id so support can trace a report', () => {
    const response = res();

    errorHandler(new AppError('Flight booking not found', 404), req({ requestId: 'r-1' }), response, vi.fn());

    expect(bodyOf(response).requestId).toBe('r-1');
  });

  it('omits the request id when the request carries none', () => {
    const response = res();

    errorHandler(new AppError('Flight booking not found', 404), req(), response, vi.fn());

    expect(bodyOf(response).requestId).toBeUndefined();
  });

  it('includes a stack trace only in development', () => {
    const originalEnv = process.env.NODE_ENV;
    const err = { statusCode: 500, message: 'Boom', stack: 'trace...' };

    try {
      process.env.NODE_ENV = 'development';
      const dev = res();
      errorHandler(err, req(), dev, vi.fn());
      expect(bodyOf(dev).stack).toBe('trace...');

      process.env.NODE_ENV = 'production';
      const prod = res();
      errorHandler(err, req(), prod, vi.fn());
      expect(bodyOf(prod).stack).toBeUndefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('logs the full error server-side while the client sees the generic message', () => {
    const request = req();
    const response = res();

    errorHandler({ statusCode: 500, message: 'connect ECONNREFUSED' }, request, response, vi.fn());

    expect(request.log.error).toHaveBeenCalled();
    expect(bodyOf(response).message).not.toContain('ECONNREFUSED');
  });

  it('logs a client error at warn, not error', () => {
    const request = req();
    const response = res();

    errorHandler(new AppError('Flight booking not found', 404), request, response, vi.fn());

    expect(request.log.warn).toHaveBeenCalled();
    expect(request.log.error).not.toHaveBeenCalled();
  });
});
