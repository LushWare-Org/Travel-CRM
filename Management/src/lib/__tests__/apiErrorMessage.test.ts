import { describe, it, expect } from 'vitest';
import { apiErrorMessage, apiFieldErrors } from '../apiErrorMessage';

describe('apiErrorMessage', () => {
  it('reports a network failure in plain language', () => {
    const message = apiErrorMessage({ isNetworkError: true, status: 0 });

    expect(message).toBe("We couldn't reach the server. Check your connection and try again.");
    expect(message).not.toMatch(/Failed to fetch|NetworkError|ERR_CONNECTION_REFUSED/);
  });

  it('prefers the message the server sent, because the backend makes it safe', () => {
    const message = apiErrorMessage({
      status: 400,
      data: { message: "We couldn't send that invoice. Please try again." },
    });

    expect(message).toBe("We couldn't send that invoice. Please try again.");
  });

  it('ignores a blank server message and falls back to the status', () => {
    expect(apiErrorMessage({ status: 404, data: { message: '   ' } })).toBe(
      "We couldn't find what you were looking for.",
    );
  });

  it('maps a 5xx with no message to a server-fault sentence', () => {
    expect(apiErrorMessage({ status: 500 })).toBe('Something went wrong on our side. Please try again.');
    expect(apiErrorMessage({ status: 503 })).toBe('Something went wrong on our side. Please try again.');
  });

  it.each([
    [400, "We couldn't process that request. Please check the details and try again."],
    [401, 'Your session has expired. Please sign in again.'],
    [403, "You don't have permission to do that."],
    [404, "We couldn't find what you were looking for."],
    [409, 'That conflicts with an existing record. Please refresh and try again.'],
    [429, 'Too many requests. Please wait a moment and try again.'],
  ])('maps status %i to its own sentence', (status, expected) => {
    expect(apiErrorMessage({ status })).toBe(expected);
  });

  it('never returns a raw error message', () => {
    // These are exactly the strings the browser produces; none may be shown.
    const raw = [
      Object.assign(new Error('Request failed with status code 500'), { status: 500 }),
      Object.assign(new Error('Network Error'), { status: 0 }),
      Object.assign(new Error('timeout of 15000ms exceeded'), { status: undefined }),
      new Error('HTTP error! status: 500'),
    ];

    for (const error of raw) {
      const message = apiErrorMessage(error);
      expect(message).not.toBe(error.message);
      expect(message).not.toMatch(/Request failed with status code|Network Error|timeout of|HTTP error!/);
    }
  });

  it('handles null, undefined and primitives without throwing', () => {
    for (const value of [null, undefined, 'boom', 42, []]) {
      expect(typeof apiErrorMessage(value)).toBe('string');
      expect(apiErrorMessage(value).length).toBeGreaterThan(0);
    }
  });

  it('reads an axios-shaped error when one is passed', () => {
    const axiosLike = { response: { status: 403, data: {} } };

    expect(apiErrorMessage(axiosLike)).toBe("You don't have permission to do that.");
  });
});

describe('apiFieldErrors', () => {
  it('returns the server field detail', () => {
    const errors = apiFieldErrors({
      status: 400,
      data: {
        code: 'VALIDATION_FAILED',
        errors: [{ field: 'contact.email', message: 'Enter a valid email address' }],
      },
    });

    expect(errors).toEqual([{ field: 'contact.email', message: 'Enter a valid email address' }]);
  });

  it('drops malformed entries rather than rendering them', () => {
    const errors = apiFieldErrors({
      data: { errors: [{ field: 'a' }, null, 'nope', { field: 'b', message: 'ok' }] },
    });

    expect(errors).toEqual([{ field: 'b', message: 'ok' }]);
  });

  it('returns an empty array when there is nothing to report', () => {
    expect(apiFieldErrors(new Error('boom'))).toEqual([]);
    expect(apiFieldErrors({ data: { errors: 'not-an-array' } })).toEqual([]);
  });
});
