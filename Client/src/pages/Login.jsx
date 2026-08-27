import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Plane, ArrowRight, Shield, Globe, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '/logo.png';
import BRANDING from '../config/branding';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await login({
          email: formData.email.trim(),
          password: formData.password,
        });
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setIsSubmitting(false);
          return;
        }
        await register({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Unable to process request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-0 bg-white rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Left Side - Branding */}
        <div className="relative bg-gradient-to-br from-brand-dark-900 via-brand-dark-800 to-brand-dark-950 p-12 flex flex-col justify-between overflow-hidden">
          <div className="absolute top-10 right-10 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-brand-accent-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-16">
              <img src={logo} alt={`${BRANDING.company.name} Logo`} className="w-54 h-54 object-contain drop-shadow-lg" />
            </div>
            <div className="mb-16">
              <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
                {isLogin ? 'Welcome Back!' : 'Start Your Journey'}
              </h1>
              <p className="text-white/80 text-lg leading-relaxed max-w-md">
                {isLogin 
                  ? 'Continue your adventure with us. Log in to explore exclusive travel experiences around the world.'
                  : 'Join thousands of travelers discovering amazing destinations with personalized itineraries and expert guidance.'}
              </p>
            </div>
              {/* Features */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-all duration-300">
                  <Globe className="w-6 h-6 text-brand-accent-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">100+ Destinations</h3>
                  <p className="text-white/70 text-sm leading-relaxed">Explore curated experiences across the globe</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-all duration-300">
                  <Shield className="w-6 h-6 text-brand-accent-400" />
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
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  isLogin
                    ? 'bg-gradient-to-r from-brand-500 to-brand-accent-500 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  !isLogin
                    ? 'bg-gradient-to-r from-brand-500 to-brand-accent-500 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Register
              </button>
            </div>

            {/* Form Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isLogin ? 'Sign in to your account' : 'Create your account'}
              </h2>
              <p className="text-gray-600 text-sm">
                {isLogin 
                  ? 'Enter your credentials to access your account' 
                  : 'Fill in the details below to get started'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="transform transition-all duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all duration-300 hover:border-gray-300"
                          required
                        />
                      </div>
                    </div>

                    <div className="transform transition-all duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="10-digit mobile number"
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all duration-300 hover:border-gray-300"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div className="transform transition-all duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all duration-300 hover:border-gray-300"
                          required
                        />
                      </div>
                    </div>

                    <div className="transform transition-all duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-14 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all duration-300 hover:border-gray-300"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600 transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="transform transition-all duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Confirm Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all duration-300 hover:border-gray-300"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="transform transition-all duration-300">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all duration-300 hover:border-gray-300"
                        required
                      />
                    </div>
                  </div>

                  <div className="transform transition-all duration-300">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-14 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all duration-300 hover:border-gray-300"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {isLogin && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                  </label>
                  <a href="#" className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors">
                    Forgot password?
                  </a>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-brand-500 to-brand-accent-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center space-x-2 group mt-8 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Create Account')}</span>
                {!isSubmitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-bold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}