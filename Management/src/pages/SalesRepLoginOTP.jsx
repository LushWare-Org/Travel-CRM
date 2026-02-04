import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Clock } from 'lucide-react';
import { getLoginBranding } from '../config/branding';

export default function SalesRepLoginOTP() {
  const navigate = useNavigate();

  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [timer, setTimer] = useState(600); // 10 minutes = 600 seconds
  const [attemptCount, setAttemptCount] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  // Initialize from localStorage
  useEffect(() => {
    const token = localStorage.getItem('otpTempToken');
    const email = localStorage.getItem('otpMaskedEmail');

    if (!token || !email) {
      // No OTP session - redirect to login
      navigate('/login');
      return;
    }

    setTempToken(token);
    setMaskedEmail(email);
    setTimer(600);
    setCanResendOtp(true);
  }, [navigate]);

  // Timer for OTP expiration
  useEffect(() => {
    if (timer === 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setError('OTP has expired. Please login again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

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

      console.log('OTP Response:', response.data); // Debug log

      if (response.data.status === 'success') {
        console.log('Login successful, user data:', response.data.data.user); // Debug log

        // Store token and user data directly in localStorage
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));

        // Update axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;

        // Clean up OTP session
        localStorage.removeItem('otpTempToken');
        localStorage.removeItem('otpMaskedEmail');

        toast.success('Login successful!');

        // Wait a moment, then navigate to dashboard
        setTimeout(() => {
          window.location.href = '/'; // Force page reload to update context
        }, 500);
      } else {
        console.error('Unexpected response status:', response.data.status); // Debug log
        throw new Error('Unexpected response from server');
      }
    } catch (err) {
      console.error('OTP Verification Error:', err); // Debug log
      const errorMessage = err.response?.data?.message || err.message || 'Invalid OTP. Please try again.';
      setError(errorMessage);

      // Increment attempt count
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      // Show attempt warning
      if (newAttemptCount < 5) {
        toast.error(`${errorMessage} (${5 - newAttemptCount} attempts remaining)`);
      } else {
        toast.error('Too many failed attempts. Please login again.');
        // Clear session and redirect
        localStorage.removeItem('otpTempToken');
        localStorage.removeItem('otpMaskedEmail');
        navigate('/login');
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
        setResendTimer(60);
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

  const handleBackToLogin = () => {
    localStorage.removeItem('otpTempToken');
    localStorage.removeItem('otpMaskedEmail');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{getLoginBranding().title}</h1>
          <p className="text-gray-600">Verify Your Identity</p>
        </div>

        {/* OTP Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter OTP</h2>
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
                className="w-full px-4 py-3 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none tracking-widest font-mono"
                disabled={isSubmitting || timer === 0}
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
              onClick={handleBackToLogin}
              disabled={isSubmitting}
              className="w-full text-gray-600 hover:text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              ← Back to Login
            </button>
          </form>

          {/* Security Info */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>🔒 Security:</strong> Never share your OTP code. We will never ask for it via email or phone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
