import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Eye, EyeOff, Mail, Clock } from 'lucide-react';
import BRANDING, { getLoginBranding } from '../config/branding';

// Only show test credentials in development when explicitly enabled
const showTestCredentials = import.meta.env.VITE_SHOW_TEST_CREDENTIALS === 'true';

export default function SalesRepLogin() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [step, setStep] = useState('credentials'); // 'credentials' or 'otp'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [timer, setTimer] = useState(600); // 10 minutes = 600 seconds
  const [attemptCount, setAttemptCount] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.lushtravelcloud.com/api/v1';

  // Timer for OTP expiration
  useEffect(() => {
    if (step !== 'otp' || timer === 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setError('OTP has expired. Please request a new one.');
          setStep('credentials');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, timer]);

  // Timer for resend OTP button
  useEffect(() => {
    if (resendTimer === 0) {
      setCanResendOtp(true);
      return;
    }

    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCredentialsChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const validateCredentials = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.password) {
      setError('Password is required');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateCredentials()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login-step1`, formData);

      if (response.data.status === 'success') {
        setTempToken(response.data.data.tempToken);
        setMaskedEmail(response.data.data.maskedEmail);
        setTimer(response.data.data.expiresIn || 600);
        setStep('otp');
        setOtpCode('');
        setAttemptCount(0);
        setResendTimer(0);
        setCanResendOtp(true);
        toast.success('OTP sent to your email');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateOTP = () => {
    if (!otpCode.trim()) {
      setError('OTP is required');
      return false;
    }

    if (otpCode.length !== 6) {
      setError('OTP must be 6 digits');
      return false;
    }

    if (!/^\d{6}$/.test(otpCode)) {
      setError('OTP must contain only digits');
      return false;
    }

    return true;
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateOTP()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login-step2`, {
        tempToken,
        otp: otpCode,
      });

      if (response.data.status === 'success') {
        // Store token and user data
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));

        // Update auth context if available
        if (setAuth) {
          setAuth(response.data.data.user, response.data.data.token);
        }

        toast.success('Login successful!');
        navigate('/');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(errorMessage);

      // Increment attempt count
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      // Show attempt warning
      if (newAttemptCount < 5) {
        toast.error(`${errorMessage} (${5 - newAttemptCount} attempts remaining)`);
      } else {
        toast.error('Too many failed attempts. Please request a new OTP.');
        setStep('credentials');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;

    setError('');
    setIsSubmitting(true);
    setCanResendOtp(false);

    try {
      const response = await axios.post(`${API_URL}/auth/resend-otp`, {
        tempToken,
      });

      if (response.data.status === 'success') {
        setTimer(response.data.data.expiresIn || 600);
        setOtpCode('');
        setAttemptCount(0);
        setResendTimer(60); // Disable resend button for 60 seconds
        toast.success('New OTP sent to your email');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to resend OTP. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setCanResendOtp(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setOtpCode('');
    setError('');
    setTimer(600);
    setAttemptCount(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">{getLoginBranding().title}</h1>
          <p className="text-gray-600 text-sm sm:text-base">Sales Representative Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-5 sm:p-8">
          {step === 'credentials' ? (
            <>
              {/* Step 1: Credentials */}
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
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
                    onChange={handleCredentialsChange}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    disabled={isSubmitting}
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
                      onChange={handleCredentialsChange}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                >
                  {isSubmitting ? (
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
                      Verifying...
                    </>
                  ) : (
                    'Next: Verify with OTP'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Step 2: OTP Verification */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify OTP</h2>
                <p className="text-gray-600 text-sm">
                  We've sent a 6-digit code to <strong>{maskedEmail}</strong>
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                {/* OTP Input Field */}
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    id="otp"
                    type="text"
                    maxLength="6"
                    value={otpCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setOtpCode(value);
                      setError('');
                    }}
                    placeholder="000000"
                    className="w-full px-4 py-3 text-center text-2xl sm:text-3xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none tracking-wider sm:tracking-widest font-mono"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Timer and Resend */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Clock size={16} className="mr-2" />
                    <span>
                      {timer > 0 ? (
                        <>
                          Expires in <strong className="ml-1">{formatTime(timer)}</strong>
                        </>
                      ) : (
                        <span className="text-red-600">OTP expired</span>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!canResendOtp || isSubmitting || timer === 0}
                    className={`font-medium transition ${canResendOtp && timer > 0
                        ? 'text-blue-600 hover:text-blue-700 cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>

                {/* Attempt Counter */}
                {attemptCount > 0 && attemptCount < 5 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      {5 - attemptCount} attempt{5 - attemptCount !== 1 ? 's' : ''} remaining
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length !== 6 || timer === 0}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                >
                  {isSubmitting ? (
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
                      Verifying...
                    </>
                  ) : (
                    'Complete Login'
                  )}
                </button>

                {/* Back Button */}
                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  disabled={isSubmitting}
                  className="w-full text-gray-600 hover:text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                  ← Back to Email & Password
                </button>
              </form>

              {/* Security Info */}
              <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>🔒 Security:</strong> Never share your OTP code. We will never ask for it via email or phone.
                </p>
              </div>
            </>
          )}

          {/* Footer Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Authorized personnel only. All access is monitored and logged.
            </p>
          </div>
        </div>

        {/* Test Credentials Info - Only shown in development when enabled */}
        {step === 'credentials' && showTestCredentials && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium mb-2">Test Sales Rep Credentials (Development Only):</p>
            <div className="grid grid-cols-1 gap-1 text-xs text-yellow-700">
              <p>
                Email: <code className="bg-white px-2 py-1 rounded">salesrep@example.com</code>
              </p>
              <p>
                Password: <code className="bg-white px-2 py-1 rounded">Sales@123456</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
