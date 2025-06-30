import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, TestTube } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';

type AuthMode = 'signin' | 'signup';
type UserRole = 'buyer' | 'seller';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [role, setRole] = useState<UserRole>('buyer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBetaLogin = async () => {
    setLoading(true);
    try {
      await signIn('beta', 'beta');
      navigate('/dashboard');
    } catch (error: any) {
      setErrors({ submit: error.message || 'Beta login failed' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'signup' && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(formData.email, formData.password);
        navigate('/dashboard');
      } else {
        await signUp(formData.email, formData.password, role);
        // Show success message - user needs to verify email
        alert('Account created! Please check your email to verify your account.');
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ email: 'Please enter your email address to reset your password' });
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ email: 'Please enter a valid email' });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/settings?tab=security`,
      });
      
      if (error) throw error;
      
      // Show success message
      setErrors({ submit: '' });
      alert('Password reset email sent! Please check your inbox.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 transition-colors duration-300" />
      
      <div className="relative max-w-md w-full mx-auto px-4">
        <GlassCard className="p-8 bg-white dark:bg-midnight-800/10 shadow-glass-light dark:shadow-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Beta Access to Startifi
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {mode === 'signin' 
                  ? 'Sign in to access your MVP library' 
                  : 'Join thousands of developers building faster'
                }
              </p>
            </motion.div>
          </div>

          {/* Beta Login Button */}
          <div className="mb-6">
            <GlossyButton
              onClick={handleBetaLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 hover:from-green-600 hover:to-emerald-600 dark:hover:from-green-700 dark:hover:to-emerald-700"
            >
              <TestTube className="w-4 h-4" />
              <span>Beta Access (beta/beta)</span>
            </GlossyButton>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
              Full access with seller approval and unlimited downloads
            </p>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-white/10 text-gray-500 dark:text-gray-400">Or continue with</span>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-white/10 p-1 mb-6 shadow-sm">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Role Selection (Sign Up Only) */}
          {mode === 'signup' && (
            <div className="mb-6 transition-colors duration-300">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                I want to:
              </label>
              <div className="flex rounded-xl bg-gray-100 dark:bg-white/10 p-1 shadow-sm">
                <button
                  onClick={() => setRole('buyer')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    role === 'buyer'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Buy MVPs
                </button>
                <button
                  onClick={() => setRole('seller')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    role === 'seller'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Sell MVPs
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email} 
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-white/20'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300 dark:border-white/20'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password (Sign Up Only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-white/20'
                    }`}
                    placeholder="Confirm your password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-sm transition-colors duration-300">{errors.submit}</p>
              </div>
            )}

            {/* Submit Button */}
            <GlossyButton
              type="submit"
              loading={loading}
              className="w-full"
            >
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </GlossyButton>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center transition-colors duration-300">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
            
            {mode === 'signin' && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                <button 
                  type="button" 
                  onClick={handleForgotPassword} 
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot your password?
                </button>
              </p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};