import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { login as apiLogin, register as apiRegister } from '../services/api/auth';
import { getToken, getUser, persist as persistAuth } from '../services/auth/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
      setToken(getToken());
    }
    setLoading(false);
  }, []);

  const persist = useCallback((nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken || null);
    persistAuth(nextUser, nextToken || null);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const response = await apiLogin({ email, password });
    const { token: respToken, user: respUser } = response?.data || {};
    if (!respUser) {
      throw new Error('Invalid login response from server');
    }
    persist(respUser, respToken);
    setTimeout(() => window.location.reload(), 100);
    return respUser;
  }, [persist]);

  const register = useCallback(async ({ name, email, phone, password, confirmPassword }) => {
    const response = await apiRegister({ name, email, phone, password, confirmPassword });
    const { token: respToken, user: respUser } = response?.data || {};
    if (!respUser) {
      throw new Error('Invalid registration response from server');
    }
    persist(respUser, respToken);
    setTimeout(() => window.location.reload(), 100);
    return respUser;
  }, [persist]);

  const logout = useCallback(() => {
    persist(null, null);
    setTimeout(() => window.location.reload(), 100);
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


