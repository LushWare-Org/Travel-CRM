import { describe, it, expect } from 'vitest';
import AppError from '../appError.js';

describe('AppError', () => {
  it('should create an operational error with status code', () => {
    const err = new AppError('Something went wrong', 400);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Something went wrong');
    expect(err.statusCode).toBe(400);
    expect(err.status).toBe('fail');
    expect(err.isOperational).toBe(true);
  });

  it('should set status to "error" for 5xx codes', () => {
    const err = new AppError('Server error', 500);
    expect(err.status).toBe('error');
  });

  it('should set status to "fail" for 4xx codes', () => {
    const err404 = new AppError('Not found', 404);
    expect(err404.status).toBe('fail');

    const err403 = new AppError('Forbidden', 403);
    expect(err403.status).toBe('fail');
  });
});
