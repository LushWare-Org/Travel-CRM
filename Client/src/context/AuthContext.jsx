import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { login as apiLogin, register as apiRegister } from '../utils/authApi';

const AuthContext = createContext(null);

const STORAGE_KEY = 'tsw_auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user) {
          setUser(parsed.user);
          setToken(parsed.token || null);
        }
      }
    } catch {
      // ignore parse errors
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback((nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken || null);
    if (nextUser) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: nextUser, token: nextToken || null }),
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const response = await apiLogin({ email, password });
    const { token: respToken, user: respUser } = response?.data || {};
    if (!respUser) {
      throw new Error('Invalid login response from server');
    }
    persist(respUser, respToken);
    return respUser;
  }, [persist]);

  const register = useCallback(async ({ name, email, phone, password, confirmPassword }) => {
    const response = await apiRegister({ name, email, phone, password, confirmPassword });
    const { token: respToken, user: respUser } = response?.data || {};
    if (!respUser) {
      throw new Error('Invalid registration response from server');
    }
    persist(respUser, respToken);
    return respUser;
  }, [persist]);

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}


