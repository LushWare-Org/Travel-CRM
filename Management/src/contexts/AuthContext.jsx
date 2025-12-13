import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  // Initialize auth from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken) {
        setToken(savedToken);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        setIsAuthenticated(true);
        // Set default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(
    async (email, password) => {
      try {
        setLoading(true);
        const response = await axios.post(`${API_URL}/auth/login`, {
          email,
          password,
        });

        // Check if OTP is required (for sales representatives)
        if (response.data.data?.requiresOTP) {
          // Store temporary data for OTP verification
          localStorage.setItem('otpTempToken', response.data.data.tempToken);
          localStorage.setItem('otpMaskedEmail', response.data.data.maskedEmail);
          toast.success('OTP sent to your email. Please verify to continue.');
          return 'otp-required';
        }

        // Check if password change is required (for first-time login with temporary password)
        if (response.data.data?.mustChangePassword) {
          // Store temporary credentials for password reset
          localStorage.setItem('resetEmail', email);
          localStorage.setItem('tempPassword', password);
          toast.success('🔐 Please set your new password');
          return 'password-reset-required';
        }

        const { token: authToken, user: userData } = response.data.data;

        // Save to localStorage
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));

        // Update state
        setToken(authToken);
        setUser(userData);
        setIsAuthenticated(true);

        // Set default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

        return true;
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
        toast.error(errorMessage);
        console.error('Login error:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [API_URL]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Only call logout endpoint if we have a valid token
      if (token) {
        try {
          await axios.post(`${API_URL}/auth/logout`);
        } catch (error) {
          // Logout endpoint errors are not critical - continue with local cleanup
          if (error.response?.status === 401) {
            console.warn('Token already expired or invalid, skipping server logout');
          } else {
            console.error('Logout error:', error);
          }
        }
      }
    } finally {
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Clear state
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);

      // Clear authorization header
      delete axios.defaults.headers.common['Authorization'];

      toast.success('Logged out successfully');
    }
  }, [API_URL, token]);

  // Update profile function
  const updateProfile = useCallback(
    async (profileData) => {
      try {
        setLoading(true);
        const response = await axios.put(`${API_URL}/auth/profile`, profileData);

        const updatedUser = response.data.data.user;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);

        toast.success('Profile updated successfully');
        return true;
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Failed to update profile';
        toast.error(errorMessage);
        console.error('Update profile error:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [API_URL]
  );

  // Change password function
  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      try {
        setLoading(true);
        await axios.put(`${API_URL}/auth/change-password`, {
          currentPassword,
          newPassword,
          confirmPassword: newPassword,
        });

        toast.success('Password changed successfully');
        return true;
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Failed to change password';
        toast.error(errorMessage);
        console.error('Change password error:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [API_URL]
  );

  // Verify if user has a specific role
  const hasRole = useCallback((requiredRole) => {
    if (!user) return false;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
  }, [user]);

  const value = {
    user,
    loading,
    isAuthenticated,
    token,
    login,
    logout,
    updateProfile,
    changePassword,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
