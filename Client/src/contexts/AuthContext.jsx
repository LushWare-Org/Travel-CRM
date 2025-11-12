import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import authService from '../services/authService';

// Create the context
const AuthContext = createContext(null);

/**
 * AuthProvider Component - Provides authentication state to the app
 * Manages user login state, token persistence, and auth operations
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Register function
  const register = useCallback(async (name, email, password, confirmPassword, phone = '', phoneCountry = 'US') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register(name, email, password, confirmPassword, phone, phoneCountry);
      setToken(response.data.token);
      setUser(response.data.user);
      setIsAuthenticated(true);
      return response;
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(email, password);
      setToken(response.data.token);
      setUser(response.data.user);
      setIsAuthenticated(true);
      return response;
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      toast.success('Logged out successfully', { duration: 2000 });
    } catch (err) {
      console.error('Logout error:', err);
      toast.error('Logout failed', { duration: 3000 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update profile function
  const updateProfile = useCallback(async (profileData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.updateProfile(profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully', { duration: 3000 });
      return response;
    } catch (err) {
      const errorMessage = err.message || 'Profile update failed';
      setError(errorMessage);
      toast.error(errorMessage, { duration: 4000 });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Change password function
  const changePassword = useCallback(async (currentPassword, newPassword, confirmPassword) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.changePassword(currentPassword, newPassword, confirmPassword);
      toast.success('Password changed successfully', { duration: 3000 });
      return response;
    } catch (err) {
      const errorMessage = err.message || 'Password change failed';
      setError(errorMessage);
      toast.error(errorMessage, { duration: 4000 });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Forgot password function
  const forgotPassword = useCallback(async (email) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.forgotPassword(email);
      toast.success('Password reset email sent! Check your inbox.', { duration: 4000 });
      return response;
    } catch (err) {
      const errorMessage = err.message || 'Failed to request password reset';
      setError(errorMessage);
      toast.error(errorMessage, { duration: 4000 });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset password function
  const resetPassword = useCallback(async (token, password, confirmPassword) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.resetPassword(token, password, confirmPassword);
      setToken(response.data.token);
      setUser(response.data.user);
      setIsAuthenticated(true);
      toast.success('Password reset successful! You are now logged in.', { duration: 3000 });
      return response;
    } catch (err) {
      const errorMessage = err.message || 'Password reset failed';
      setError(errorMessage);
      toast.error(errorMessage, { duration: 4000 });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify email function
  const verifyEmail = useCallback(async (token) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.verifyEmail(token);
      if (user) {
        setUser({ ...user, isEmailVerified: true });
      }
      toast.success('Email verified successfully!', { duration: 3000 });
      return response;
    } catch (err) {
      const errorMessage = err.message || 'Email verification failed';
      setError(errorMessage);
      toast.error(errorMessage, { duration: 4000 });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Resend verification email
  const resendVerification = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.resendVerification();
      toast.success('Verification email sent! Check your inbox.', { duration: 4000 });
      return response;
    } catch (err) {
      const errorMessage = err.message || 'Failed to resend verification email';
      setError(errorMessage);
      toast.error(errorMessage, { duration: 4000 });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    // State
    user,
    token,
    isLoading,
    isAuthenticated,
    error,

    // Methods
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,

    // Utilities
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth Hook - Use this hook to access auth context in components
 * @returns {object} Auth context value
 * @example
 * const { user, login, logout } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
