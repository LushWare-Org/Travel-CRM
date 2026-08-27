// Single source of truth for the 'tsw_auth' localStorage envelope — the key
// AuthContext actually reads/writes. Consolidates three previously-divergent
// readers: AuthContext ('tsw_auth'), the old pdf/apiService.js ('authToken'
// / 'token' — wrong keys, silently never sent a valid Authorization header),
// and MyAccount.jsx's raw fetch (correct key, but hand-rolled parsing).

export interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

interface AuthEnvelope {
  user: AuthUser | null;
  token: string | null;
}

const STORAGE_KEY = 'tsw_auth';

const readEnvelope = (): AuthEnvelope | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.user) return null;
    return { user: parsed.user, token: parsed.token ?? null };
  } catch {
    return null;
  }
};

export const getToken = (): string | null => readEnvelope()?.token ?? null;

export const getUser = (): AuthUser | null => readEnvelope()?.user ?? null;

export const persist = (user: AuthUser | null, token: string | null): void => {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token: token ?? null }));
};

export const clear = (): void => localStorage.removeItem(STORAGE_KEY);

/**
 * Merges `partialUser` into the currently-stored user and re-persists,
 * keeping the existing token untouched. Used by MyAccount's profile-save
 * flow, which historically re-wrote the whole envelope by hand.
 */
export const mergeStoredUser = (partialUser: Partial<AuthUser>): AuthUser | null => {
  const envelope = readEnvelope();
  if (!envelope?.user) return null;
  const mergedUser = { ...envelope.user, ...partialUser };
  persist(mergedUser, envelope.token);
  return mergedUser;
};
