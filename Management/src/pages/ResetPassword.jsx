import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '../services/auth.service';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    email: localStorage.getItem('resetEmail') || '',
    tempPassword: localStorage.getItem('tempPassword') || '',
    newPassword: '',
    confirmPassword: '',
  });

  // Redirect to login if no credentials in localStorage
  useEffect(() => {
    if (!formData.email || !formData.tempPassword) {
      toast.error('❌ No pending password reset. Please log in first.');
      navigate('/login');
    }
  }, []);

  // Password strength calculator
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    
    if (password.length >= 12) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[!@#$%^&*]/.test(password)) strength += 20;
    
    return strength;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Update password strength
    if (name === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.tempPassword) {
      newErrors.tempPassword = 'Temporary password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 12) {
      newErrors.newPassword = 'Password must be at least 12 characters';
    } else if (!/[A-Z]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Must contain at least one number';
    } else if (!/[!@#$%^&*]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Must contain at least one special character (!@#$%^&*)';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.resetPassword({
        email: formData.email,
        currentPassword: formData.tempPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      if (response.status === 'success') {
        // Clear stored credentials
        localStorage.removeItem('resetEmail');
        localStorage.removeItem('tempPassword');

        toast.success('✅ Password reset successfully! Please log in with your new password.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(response.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'An error occurred while resetting password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-red-500';
    if (passwordStrength < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 80) return 'Fair';
    return 'Strong';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-8 transition"
        >
          <ArrowLeft size={20} />
          <span>Back to Login</span>
        </button>

        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-purple-100 p-3 sm:p-4 rounded-full">
              <Lock className="text-purple-600" size={28} />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600 text-sm sm:text-base">Set your new permanent password</p>
        </div>

        {/* Info Banner */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-blue-900 font-medium">First Time Setup</p>
            <p className="text-xs sm:text-sm text-blue-800 mt-1">
              You received a temporary password via email. Use it here along with your new permanent password.
            </p>
          </div>
        </div>

        {/* Reset Form */}
        <div className="bg-white rounded-lg shadow-lg p-5 sm:p-8">
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
                placeholder="your@email.com"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-purple-500'
                }`}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={16} />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Temporary Password Field */}
            <div>
              <label htmlFor="tempPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Temporary Password (from email)
              </label>
              <input
                id="tempPassword"
                type="password"
                name="tempPassword"
                value={formData.tempPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
                  errors.tempPassword
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-purple-500'
                }`}
                disabled={isSubmitting}
              />
              {errors.tempPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={16} />
                  {errors.tempPassword}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New Password</span>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition pr-10 ${
                    errors.newPassword
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-purple-500'
                  }`}
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

              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">Password Strength:</span>
                    <span className={`text-xs font-bold ${
                      passwordStrength < 40
                        ? 'text-red-600'
                        : passwordStrength < 80
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                      style={{ width: `${passwordStrength}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {errors.newPassword && (
                <p className="mt-2 text-sm text-red-600">
                  <AlertCircle className="inline mr-1" size={16} />
                  {errors.newPassword}
                </p>
              )}

              {/* Password Requirements */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-2">Password must include:</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li className={`flex items-center gap-2 ${
                    formData.newPassword.length >= 12 ? 'text-green-600' : ''
                  }`}>
                    <span className={formData.newPassword.length >= 12 ? '✓' : '○'}>
                      {formData.newPassword.length >= 12 ? '✓' : '○'}
                    </span>
                    At least 12 characters
                  </li>
                  <li className={`flex items-center gap-2 ${
                    /[A-Z]/.test(formData.newPassword) ? 'text-green-600' : ''
                  }`}>
                    <span>{/[A-Z]/.test(formData.newPassword) ? '✓' : '○'}</span>
                    Uppercase letter (A-Z)
                  </li>
                  <li className={`flex items-center gap-2 ${
                    /[a-z]/.test(formData.newPassword) ? 'text-green-600' : ''
                  }`}>
                    <span>{/[a-z]/.test(formData.newPassword) ? '✓' : '○'}</span>
                    Lowercase letter (a-z)
                  </li>
                  <li className={`flex items-center gap-2 ${
                    /[0-9]/.test(formData.newPassword) ? 'text-green-600' : ''
                  }`}>
                    <span>{/[0-9]/.test(formData.newPassword) ? '✓' : '○'}</span>
                    Number (0-9)
                  </li>
                  <li className={`flex items-center gap-2 ${
                    /[!@#$%^&*]/.test(formData.newPassword) ? 'text-green-600' : ''
                  }`}>
                    <span>{/[!@#$%^&*]/.test(formData.newPassword) ? '✓' : '○'}</span>
                    Special character (!@#$%^&*)
                  </li>
                </ul>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition pr-10 ${
                    errors.confirmPassword
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-purple-500'
                  }`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={16} />
                  {errors.confirmPassword}
                </p>
              )}
              {formData.newPassword &&
                formData.confirmPassword &&
                formData.newPassword === formData.confirmPassword && (
                  <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle size={16} />
                    Passwords match!
                  </p>
                )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Resetting Password...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Reset Password
                </>
              )}
            </button>
          </form>

          {/* Help Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Need help? Contact your administrator or check your email for further instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
