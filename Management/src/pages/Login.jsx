import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';
import BRANDING, { getLoginBranding } from '../config/branding';

// Only show test credentials in development when explicitly enabled
const showTestCredentials = import.meta.env.VITE_SHOW_TEST_CREDENTIALS === 'true';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

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
      const result = await login(formData.email, formData.password);

      if (result === 'otp-required') {
        navigate('/sales-rep-login-otp');
      } else if (result === 'password-reset-required') {
        navigate('/reset-password');
      } else if (result === true) {
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
    <div 
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 30%, #bae6fd 60%, #7dd3fc 100%)' 
      }}
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-sky-200/40 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-300/30 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-cyan-200/30 rounded-full blur-2xl" />
      
      {/* Floating shapes */}
      <div className="absolute top-20 left-20 w-4 h-4 bg-sky-400 rounded-full opacity-60 animate-pulse" />
      <div className="absolute top-40 right-32 w-3 h-3 bg-blue-400 rounded-full opacity-50 animate-bounce" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-32 left-1/4 w-5 h-5 bg-cyan-400 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-2xl mb-6">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-sky-900 mb-2">{getLoginBranding().title}</h1>
          <p className="text-sky-600 font-medium">{getLoginBranding().subtitle}</p>
        </div>

        {/* Login Card */}
        <div 
          className="backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50"
          style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,249,255,0.95) 100%)',
          }}
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-sky-900">Welcome Back</h2>
            <p className="text-sm text-sky-500 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-sky-800 mb-2">
                Email Address
              </label>
              <div className={`relative transition-all duration-300 ${focusedField === 'email' ? 'scale-[1.02]' : ''}`}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Mail className={`w-5 h-5 transition-colors ${focusedField === 'email' ? 'text-sky-500' : 'text-sky-300'}`} />
                </div>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/80 border-2 border-sky-100 rounded-2xl focus:outline-none focus:border-sky-400 focus:bg-white transition-all text-sky-900 placeholder-sky-300"
                  disabled={isSubmitting || loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-sky-800 mb-2">
                Password
              </label>
              <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'scale-[1.02]' : ''}`}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Lock className={`w-5 h-5 transition-colors ${focusedField === 'password' ? 'text-sky-500' : 'text-sky-300'}`} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 bg-white/80 border-2 border-sky-100 rounded-2xl focus:outline-none focus:border-sky-400 focus:bg-white transition-all text-sky-900 placeholder-sky-300"
                  disabled={isSubmitting || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sky-400 hover:text-sky-600 transition-colors p-1"
                  disabled={isSubmitting || loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
              }}
            >
              {isSubmitting || loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-sky-100">
            <p className="text-center text-xs text-sky-400">
              Authorized personnel only. All access is monitored.
            </p>
            <p className="text-center text-sm text-sky-600 mt-4">
              Sales Rep? <a href="/sales-rep-login" className="text-sky-500 hover:text-sky-700 font-semibold transition-colors">Login with OTP →</a>
            </p>
          </div>
        </div>

        {/* Test Credentials Info - Only shown in development when enabled */}
        {showTestCredentials && (
          <div 
            className="mt-6 rounded-2xl p-5 border backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.9) 0%, rgba(253, 230, 138, 0.8) 100%)',
              borderColor: 'rgba(251, 191, 36, 0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-amber-400 flex items-center justify-center">
                <span className="text-xs">🔑</span>
              </div>
              <p className="text-sm text-amber-800 font-semibold">Development Credentials</p>
            </div>
            <div className="grid gap-3 text-xs">
              <div className="p-3 bg-white/60 rounded-xl">
                <p className="font-semibold text-amber-700 mb-1">Super Admin</p>
                <p className="text-amber-600">Email: <code className="bg-white px-2 py-0.5 rounded text-amber-800">admin@lushware.com</code></p>
                <p className="text-amber-600 mt-1">Pass: <code className="bg-white px-2 py-0.5 rounded text-amber-800">Admin@123456</code></p>
              </div>
              <div className="p-3 bg-white/60 rounded-xl">
                <p className="font-semibold text-amber-700 mb-1">Sales Rep</p>
                <p className="text-amber-600">Email: <code className="bg-white px-2 py-0.5 rounded text-amber-800">ravish@gmail.com</code></p>
                <p className="text-amber-600 mt-1">Pass: <code className="bg-white px-2 py-0.5 rounded text-amber-800">Sales@123456</code></p>
              </div>
            </div>
          </div>
        )}

        {/* Copyright */}
        <p className="text-center text-xs text-sky-400 mt-6">
          © {new Date().getFullYear()} {BRANDING.company.name}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
