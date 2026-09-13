import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { login as apiLogin, register as apiRegister } from '../services/api/auth';
import { getToken, getUser, persist as persistAuth, type AuthUser } from '../services/auth/tokenStorage';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
      setToken(getToken());
    }
    setLoading(false);
  }, []);

  const persist = useCallback((nextUser: AuthUser | null, nextToken: string | null | undefined) => {
    setUser(nextUser);
    setToken(nextToken || null);
    persistAuth(nextUser, nextToken || null);
  }, []);

  const login = useCallback(
    async ({ email, password }: LoginPayload): Promise<AuthUser> => {
      const { token: respToken, user: respUser } = await apiLogin({ email, password });
      if (!respUser) {
        throw new Error('Invalid login response from server');
      }
      persist(respUser, respToken);
      setTimeout(() => window.location.reload(), 100);
      return respUser;
    },
    [persist],
  );

  const register = useCallback(
    async ({ name, email, phone, password, confirmPassword }: RegisterPayload): Promise<AuthUser> => {
      const { token: respToken, user: respUser } = await apiRegister({ name, email, phone, password, confirmPassword });
      if (!respUser) {
        throw new Error('Invalid registration response from server');
      }
      persist(respUser, respToken);
      setTimeout(() => window.location.reload(), 100);
      return respUser;
    },
    [persist],
  );

  const logout = useCallback(() => {
    persist(null, null);
    setTimeout(() => window.location.reload(), 100);
  }, [persist]);

  const value: AuthContextValue = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
