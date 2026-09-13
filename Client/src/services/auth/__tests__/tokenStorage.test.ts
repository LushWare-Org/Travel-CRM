import { afterEach, describe, expect, it } from 'vitest';
import { clear, consumePostLoginRedirect, getToken, getUser, mergeStoredUser, persist, setPostLoginRedirect } from '../tokenStorage';

const STORAGE_KEY = 'tsw_auth';

afterEach(() => {
  localStorage.clear();
});

describe('getToken', () => {
  it('returns the stored token when a user envelope exists', () => {
    persist({ id: '1', name: 'Ada' }, 'abc123');
    expect(getToken()).toBe('abc123');
  });

  it('returns null when nothing is stored', () => {
    expect(getToken()).toBeNull();
  });

  it('returns null when the stored value is corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(getToken()).toBeNull();
  });

  it('returns null when the stored envelope has no user', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'abc123' }));
    expect(getToken()).toBeNull();
  });
});

describe('getUser', () => {
  it('returns the stored user object', () => {
    persist({ id: '1', name: 'Ada' }, 'abc123');
    expect(getUser()).toEqual({ id: '1', name: 'Ada' });
  });

  it('returns null when nothing is stored', () => {
    expect(getUser()).toBeNull();
  });
});

describe('persist', () => {
  it('writes a user+token envelope that getUser/getToken can read back', () => {
    persist({ id: '2', name: 'Grace' }, 'xyz789');
    expect(getUser()).toEqual({ id: '2', name: 'Grace' });
    expect(getToken()).toBe('xyz789');
  });

  it('defaults a missing token to null in the stored envelope', () => {
    persist({ id: '3' }, null);
    expect(getToken()).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).token).toBeNull();
  });

  it('removes the envelope entirely when user is null (logout)', () => {
    persist({ id: '1' }, 'abc123');
    persist(null, null);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('clear', () => {
  it('removes the stored envelope', () => {
    persist({ id: '1' }, 'abc123');
    clear();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('mergeStoredUser', () => {
  it('merges partial fields into the existing stored user, keeping the token', () => {
    persist({ id: '1', name: 'Ada', email: 'ada@example.com' }, 'abc123');
    const merged = mergeStoredUser({ name: 'Ada Lovelace' });
    expect(merged).toEqual({ id: '1', name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(getUser()).toEqual({ id: '1', name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(getToken()).toBe('abc123');
  });

  it('returns null and writes nothing when no user is currently stored', () => {
    expect(mergeStoredUser({ name: 'Nobody' })).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('setPostLoginRedirect / consumePostLoginRedirect', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('round-trips a stored path', () => {
    setPostLoginRedirect('/planner?step=3');
    expect(consumePostLoginRedirect()).toBe('/planner?step=3');
  });

  it('clears the path after one read (consumed once)', () => {
    setPostLoginRedirect('/my-account');
    consumePostLoginRedirect();
    expect(consumePostLoginRedirect()).toBeNull();
  });

  it('returns null when nothing was stored', () => {
    expect(consumePostLoginRedirect()).toBeNull();
  });
});
