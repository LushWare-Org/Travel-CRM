import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }

    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (!formData.password) {
      toast.error('Password is required');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the login function from AuthContext to ensure state is properly updated
      const result = await login(formData.email, formData.password);
      
      if (result === 'otp-required') {
        // OTP required for sales reps - redirect to OTP verification
        navigate('/sales-rep-login-otp');
      } else if (result === 'password-reset-required') {
        // Password reset is required, AuthContext already stored credentials and showed toast
        navigate('/reset-password');
      } else if (result === true) {
        // Login successful
        navigate('/');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(errorMessage);
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Trip Sky Way</h1>
          <p className="text-gray-600">Management Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                disabled={isSubmitting || loading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                  disabled={isSubmitting || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  disabled={isSubmitting || loading}
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center"
            >
              {isSubmitting || loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Authorized personnel only. All access is monitored and logged.
            </p>
            <p className="text-center text-sm text-gray-600 mt-3">
              Are you a Sales Rep? <a href="/sales-rep-login" className="text-blue-600 hover:text-blue-700 font-medium">Login with OTP</a>
            </p>
          </div>
        </div>

        {/* Test Credentials Info */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 font-medium mb-2">Test Credentials:</p>
          <div className="grid grid-cols-1 gap-1 text-xs text-yellow-700">
            <p>
              Admin — Email: <code className="bg-white px-2 py-1 rounded">admin@tripskyway.com</code>
            </p>
            <p>
              Admin — Password: <code className="bg-white px-2 py-1 rounded">Admin@123456</code>
            </p>
            <hr className="my-2 border-yellow-200" />
            <p>
              Sales Rep (Amal) — Email: <code className="bg-white px-2 py-1 rounded">amal@tripskyway.com</code>
            </p>
            <p>
              Sales Rep (Amal) — Password: <code className="bg-white px-2 py-1 rounded">Sales@123456</code>
            </p>
            <p>
              Sales Rep (Kamal) — Email: <code className="bg-white px-2 py-1 rounded">kamal@tripskyway.com</code>
            </p>
            <p>
              Sales Rep (Kamal) — Password: <code className="bg-white px-2 py-1 rounded">Sales@123456</code>
            </p>
            <p>
              Sales Rep (Nimal) — Email: <code className="bg-white px-2 py-1 rounded">nimal@tripskyway.com</code>
            </p>
            <p>
              Sales Rep (Nimal) — Password: <code className="bg-white px-2 py-1 rounded">Sales@123456</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
