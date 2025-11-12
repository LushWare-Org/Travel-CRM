import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Plane, ArrowRight, Shield, Globe, AlertCircle, CheckCircle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { parsePhoneNumber } from 'libphonenumber-js';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuth();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    phoneCountry: 'US' // Default to US
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      // Validate form
      if (isLoginMode) {
        if (!formData.email || !formData.password) {
          setError('Please fill in all fields');
          toast.error('Please fill in all fields');
          return;
        }
        
        // Show loading toast
        const toastId = toast.loading('Signing in...');
        
        // Login
        await login(formData.email, formData.password);
        
        // Update toast to success
        toast.success('Login successful! Welcome back!', { id: toastId });
        
        // Clear form
        setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '', phoneCountry: 'US' });
        
        // Redirect immediately to home page
        navigate('/');
      } else {
        // Validate registration
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
          setError('Please fill in all required fields');
          toast.error('Please fill in all required fields');
          return;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          toast.error('Password must be at least 6 characters');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          toast.error('Passwords do not match');
          return;
        }
        
        // Validate phone if provided
        if (formData.phone && !validatePhone(formData.phone, formData.phoneCountry)) {
          setError('Please provide a valid phone number');
          toast.error('Please provide a valid phone number');
          return;
        }

        // Show loading toast
        const toastId = toast.loading('Creating your account...');
        
        // Get formatted phone if provided
        let phoneData = {};
        if (formData.phone) {
          const phoneParsed = getPhoneE164(formData.phone, formData.phoneCountry);
          if (phoneParsed) {
            phoneData = {
              phone: phoneParsed.e164,
              phoneCountry: phoneParsed.countryCode
            };
          }
        }
        
        // Register
        await register(
          formData.name,
          formData.email,
          formData.password,
          formData.confirmPassword,
          phoneData.phone || formData.phone,
          phoneData.phoneCountry || formData.phoneCountry
        );
        
        // Update toast to success
        toast.success('Registration successful! Please sign in with your credentials.', { id: toastId });
        
        // Clear form
        setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '', phoneCountry: 'US' });
        
        // Switch to login tab instead of redirecting to home
        setIsLoginMode(true);
      }
    } catch (err) {
      const errorMessage = err.message || (isLoginMode ? 'Login failed' : 'Registration failed');
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 4000,
        icon: '❌',
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // Validate phone number
  const validatePhone = (phone, countryCode) => {
    if (!phone) return true; // Phone is optional for login
    
    try {
      // Try to parse the phone number
      const parsed = parsePhoneNumber(phone, countryCode);
      if (!parsed) return false;
      
      // Check if it's valid
      return parsed.isValid();
    } catch (err) {
      return false;
    }
  };

  // Format phone to E.164 format for API
  const getPhoneE164 = (phone, countryCode) => {
    try {
      const parsed = parsePhoneNumber(phone, countryCode);
      if (parsed && parsed.isValid()) {
        return {
          formatted: parsed.formatInternational(),
          e164: parsed.format('E.164'),
          countryCode: parsed.country
        };
      }
    } catch (err) {
      return null;
    }
    return null;
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setSuccessMessage('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      phoneCountry: 'US'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-0 bg-white rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Left Side - Branding */}
        <div className="relative bg-gradient-to-br from-[#001d3d] via-[#003566] to-[#000814] p-12 flex flex-col justify-between overflow-hidden">
          <div className="absolute top-10 right-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-12">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl transform hover:rotate-6 transition-transform duration-300">
                <Plane className="w-8 h-8 text-white transform -rotate-45" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white block">TripSkyWay</span>
              </div>
            </div>
            <div className="mb-16">
              <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
                {isLoginMode ? 'Welcome Back!' : 'Start Your Journey'}
              </h1>
              <p className="text-white/80 text-lg leading-relaxed max-w-md">
                {isLoginMode 
                  ? 'Continue your adventure with us. Log in to explore exclusive travel experiences around the world.'
                  : 'Join thousands of travelers discovering amazing destinations with personalized itineraries and expert guidance.'}
              </p>
            </div>
              {/* Features */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-all duration-300">
                  <Globe className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">100+ Destinations</h3>
                  <p className="text-white/70 text-sm leading-relaxed">Explore curated experiences across the globe</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-all duration-300">
                  <Shield className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">Secure Bookings</h3>
                  <p className="text-white/70 text-sm leading-relaxed">Your safety and privacy are our top priority</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl p-1.5 mb-10 shadow-inner">
              <button
                onClick={switchMode}
                type="button"
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  isLoginMode
                    ? 'bg-gradient-to-r from-orange-600 to-yellow-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Login
              </button>
              <button
                onClick={switchMode}
                type="button"
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  !isLoginMode
                    ? 'bg-gradient-to-r from-orange-600 to-yellow-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Register
              </button>
            </div>

            {/* Form Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isLoginMode ? 'Sign in to your account' : 'Create your account'}
              </h2>
              <p className="text-gray-600 text-sm">
                {isLoginMode 
                  ? 'Enter your credentials to access your account' 
                  : 'Fill in the details below to get started'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLoginMode ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="transform transition-all duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all duration-300 hover:border-gray-300 disabled:bg-gray-50"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>

                    <div className="transform transition-all duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all duration-300 hover:border-gray-300 disabled:bg-gray-50"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="transform transition-all duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-14 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all duration-300 hover:border-gray-300 disabled:bg-gray-50"
                          disabled={isLoading}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors p-1"
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="transform transition-all duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Confirm Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-14 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all duration-300 hover:border-gray-300 disabled:bg-gray-50"
                          disabled={isLoading}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors p-1"
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="transform transition-all duration-300">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number (Optional)</label>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-semibold text-gray-600 mb-2">Country</label>
                          <select
                            name="phoneCountry"
                            value={formData.phoneCountry}
                            onChange={handleChange}
                            className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all duration-300 hover:border-gray-300 disabled:bg-gray-50 text-sm"
                            disabled={isLoading}
                          >
                            <option value="US">🇺🇸 United States</option>
                            <option value="GB">🇬🇧 United Kingdom</option>
                            <option value="CA">🇨🇦 Canada</option>
                            <option value="AU">🇦🇺 Australia</option>
                            <option value="IN">🇮🇳 India</option>
                            <option value="LK">🇱🇰 Sri Lanka</option>
                            <option value="SG">🇸🇬 Singapore</option>
                            <option value="MY">🇲🇾 Malaysia</option>
                            <option value="TH">🇹🇭 Thailand</option>
                            <option value="JP">🇯🇵 Japan</option>
                            <option value="AE">🇦🇪 UAE</option>
                            <option value="FR">🇫🇷 France</option>
                            <option value="DE">🇩🇪 Germany</option>
                            <option value="IT">🇮🇹 Italy</option>
                            <option value="ES">🇪🇸 Spain</option>
                            <option value="MV">🇲🇻 Maldives</option>
                            <option value="NZ">🇳🇿 New Zealand</option>
                            <option value="ZA">🇿🇦 South Africa</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-2">Phone Number</label>
                          <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="123 456 7890"
                              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all duration-300 hover:border-gray-300 disabled:bg-gray-50 text-sm"
                              disabled={isLoading}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {formData.phone && validatePhone(formData.phone, formData.phoneCountry) ? (
                              <span className="text-green-600 flex items-center">
                                ✓ Valid: {getPhoneE164(formData.phone, formData.phoneCountry)?.formatted}
                              </span>
                            ) : formData.phone ? (
                              <span className="text-red-600">✗ Invalid phone number</span>
                            ) : (
                              <span>Enter phone with local format (e.g., 123-456-7890)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="transform transition-all duration-300">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all duration-300 hover:border-gray-300 disabled:bg-gray-50"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  <div className="transform transition-all duration-300">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-14 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all duration-300 hover:border-gray-300 disabled:bg-gray-50"
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors p-1"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {isLoginMode && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer disabled:opacity-50"
                      disabled={isLoading}
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                  </label>
                  <a href="#" className="text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors">
                    Forgot password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center space-x-2 group mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{isLoginMode ? 'Signing In...' : 'Creating Account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isLoginMode ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={switchMode}
                  type="button"
                  className="font-bold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  {isLoginMode ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}