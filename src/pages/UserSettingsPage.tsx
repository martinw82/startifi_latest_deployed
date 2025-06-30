import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Loader2, AlertCircle, CheckCircle, Github, Code, Link2, Globe, FileText, Camera, Lock, Eye, EyeOff } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { AuthService } from '../lib/auth';
import { DeploymentService } from '../lib/api';
import { supabase } from '../lib/supabase';

export const UserSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, refetch: refetchUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'connections'>('profile');
  
  // Profile fields
  const [profileForm, setProfileForm] = useState({
    username: '',
    display_name: '',
    bio: '',
    profile_picture_url: '',
    website_url: '',
    social_links: {
      twitter: '',
      linkedin: '',
      github: ''
    }
  });
  
  // Security fields
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isConnectingNetlify, setIsConnectingNetlify] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // OAuth connection states
  const [hasGithubConnection, setHasGithubConnection] = useState(false);
  const [hasNetlifyConnection, setHasNetlifyConnection] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      // Pre-fill with existing user data
      setProfileForm({
        username: user.username || '',
        display_name: user.display_name || '',
        bio: user.bio || '',
        profile_picture_url: user.profile_picture_url || '',
        website_url: user.website_url || '',
        social_links: {
          twitter: user.social_links?.twitter || '',
          linkedin: user.social_links?.linkedin || '',
          github: user.social_links?.github || ''
        }
      });
      
      // Check for existing GitHub and Netlify connections
      checkOAuthConnections(user.id);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const checkOAuthConnections = async (userId: string) => {
    try {
      // Check for GitHub token
      const { data: githubToken, error: githubError } = await supabase
        .from('user_oauth_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'github')
        .maybeSingle();
      
      if (githubError) {
        console.error('Error checking GitHub connection:', githubError);
      } else {
        setHasGithubConnection(!!githubToken);
      }
      
      // Check for Netlify token
      const { data: netlifyToken, error: netlifyError } = await supabase
        .from('user_oauth_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'netlify')
        .maybeSingle();
      
      if (netlifyError) {
        console.error('Error checking Netlify connection:', netlifyError);
      } else {
        setHasNetlifyConnection(!!netlifyToken);
      }
    } catch (error) {
      console.error('Error checking OAuth connections:', error);
    }
  };
  
  const handleConnectGithub = async () => {
    if (!user) return;

    setIsConnectingGithub(true);
    setMessage(null);
    
    try {
      // Call the initiate-buyer-github-oauth Edge Function via DeploymentService
      const result = await DeploymentService.initiateGeneralGitHubAuth(user.id);
      
      if (result.success && result.github_auth_url) {
        // Redirect to GitHub OAuth
        window.location.href = result.github_auth_url;
      } else {
        throw new Error(result.message || 'Failed to initiate GitHub authentication');
      }
    } catch (error: any) {
      console.error('Error connecting GitHub account:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'An unexpected error occurred while connecting to GitHub.' 
      });
      setIsConnectingGithub(false);
    }
  };
  
  const handleConnectNetlify = async () => {
    if (!user) return;
    
    setIsConnectingNetlify(true);
    setMessage(null);
    
    try {
      // This would typically call a function to initiate Netlify OAuth
      // Since we're using Netlify OAuth as part of the deployment flow,
      // we'll show a message that this should be done during deployment
      setMessage({ 
        type: 'info', 
        text: 'Netlify connection is handled automatically during the deployment process.'
      });
    } catch (error: any) {
      console.error('Error connecting Netlify account:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'An unexpected error occurred while connecting to Netlify.' 
      });
    } finally {
      setIsConnectingNetlify(false);
    }
  };
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({ type: 'error', text: 'You must be logged in to change your password.' });
      return;
    }

    // Validate form
    if (!passwordForm.current_password) {
      setMessage({ type: 'error', text: 'Current password is required.' });
      return;
    }
    
    if (!passwordForm.new_password) {
      setMessage({ type: 'error', text: 'New password is required.' });
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsChangingPassword(true);
    setMessage(null);

    try {
      // Use Supabase Auth to update password
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new_password
      });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to change password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({ type: 'error', text: 'You must be logged in to update settings.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    // Prepare social links object
    const socialLinks = {};
    Object.entries(profileForm.social_links).forEach(([key, value]) => {
      if (value) {
        socialLinks[key] = value;
      }
    });

    try {
      const updatedUser = await AuthService.updateProfile({
        username: profileForm.username,
        display_name: profileForm.display_name,
        bio: profileForm.bio,
        profile_picture_url: profileForm.profile_picture_url,
        website_url: profileForm.website_url,
        social_links: socialLinks
      });
      
      if (updatedUser) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        refetchUser(); // Re-fetch user data to update context
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile.' });
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please log in to view your settings.
          </p>
          <GlossyButton onClick={() => navigate('/auth')}>
            Sign In
          </GlossyButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            User Settings
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Manage your profile information
          </p>
        </motion.div>

        {/* Tabs Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white/10 backdrop-blur-md rounded-xl p-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-neon-green text-midnight-900 dark:text-midnight-900'
                  : 'text-gray-700 dark:text-gray-300 hover:text-neon-green dark:hover:text-neon-green'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'security'
                  ? 'bg-neon-green text-midnight-900 dark:text-midnight-900'
                  : 'text-gray-700 dark:text-gray-300 hover:text-neon-green dark:hover:text-neon-green'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Security</span>
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'connections'
                  ? 'bg-neon-green text-midnight-900 dark:text-midnight-900'
                  : 'text-gray-700 dark:text-gray-300 hover:text-neon-green dark:hover:text-neon-green'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Connections</span>
            </button>
          </div>
        </div>

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Identity Section */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-neon-green mb-4">User Identity</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Username Field */}
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Username *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          id="username"
                          value={profileForm.username}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-neon-green/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                          placeholder="Enter your username"
                          disabled={isSubmitting}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Used for URLs and mentions. Can't contain spaces.
                      </p>
                    </div>

                    {/* Display Name Field */}
                    <div>
                      <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Display Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          id="display_name"
                          value={profileForm.display_name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, display_name: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                          placeholder="Enter your display name"
                          disabled={isSubmitting}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Name displayed publicly throughout the site.
                      </p>
                    </div>
                  </div>

                  {/* Profile Picture URL Field */}
                  <div>
                    <label htmlFor="profile_picture_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Profile Picture URL
                    </label>
                    <div className="relative">
                      <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        id="profile_picture_url"
                        value={profileForm.profile_picture_url}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, profile_picture_url: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                        placeholder="https://example.com/profile.jpg"
                        disabled={isSubmitting}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      URL to your profile picture. We recommend using a service like Imgur or a CDN.
                    </p>
                  </div>
                  
                  {/* Email (Read-only) */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        id="email"
                        value={user.email}
                        className="w-full pl-10 pr-4 py-3 bg-gray-100/10 backdrop-blur-md border border-gray-300/20 rounded-xl text-gray-600 dark:text-gray-400 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Email address can only be changed through your account settings in Supabase.
                    </p>
                  </div>
                </div>

                {/* Bio and Website Section */}
                <div className="space-y-6 pt-6 border-t border-white/10">
                  <h2 className="text-xl font-semibold text-neon-green">Bio & Links</h2>
                  
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bio
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <textarea
                        id="bio"
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                        rows={4}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 resize-none"
                        placeholder="Tell others about yourself..."
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  {/* Website URL Field */}
                  <div>
                    <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Website URL
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        id="website_url"
                        value={profileForm.website_url}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, website_url: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                        placeholder="https://yourwebsite.com"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  {/* Social Links Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Social Links
                    </label>
                    
                    {/* Twitter */}
                    <div className="mb-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          𝕏
                        </span>
                        <input
                          type="url"
                          placeholder="https://twitter.com/username"
                          value={profileForm.social_links.twitter}
                          onChange={(e) => setProfileForm(prev => ({
                            ...prev,
                            social_links: {
                              ...prev.social_links,
                              twitter: e.target.value
                            }
                          }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    
                    {/* LinkedIn */}
                    <div className="mb-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          in
                        </span>
                        <input
                          type="url"
                          placeholder="https://linkedin.com/in/username"
                          value={profileForm.social_links.linkedin}
                          onChange={(e) => setProfileForm(prev => ({
                            ...prev,
                            social_links: {
                              ...prev.social_links,
                              linkedin: e.target.value
                            }
                          }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    
                    {/* GitHub */}
                    <div>
                      <div className="relative">
                        <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="url"
                          placeholder="https://github.com/username"
                          value={profileForm.social_links.github}
                          onChange={(e) => setProfileForm(prev => ({
                            ...prev,
                            social_links: {
                              ...prev.social_links,
                              github: e.target.value
                            }
                          }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Display */}
                {message && (
                  <div className={`p-4 rounded-lg border ${
                    message.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                      : message.type === 'info'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : message.type === 'info' ? (
                        <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                      <p className={`text-sm ${
                        message.type === 'success'
                          ? 'text-green-800 dark:text-green-200'
                          : message.type === 'info'
                            ? 'text-blue-800 dark:text-blue-200'
                            : 'text-red-800 dark:text-red-200'
                      }`}>
                        {message.text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end pt-6 border-t border-white/10">
                  <GlossyButton
                    type="submit"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    className="flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Profile</span>
                    )}
                  </GlossyButton>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {/* Security Tab Content */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="p-8">
              <h2 className="text-xl font-semibold text-neon-green mb-6">Password & Security</h2>
              
              <form onSubmit={handlePasswordChange} className="space-y-6">
                {/* Current Password */}
                <div>
                  <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      id="current_password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                      className="w-full pl-10 pr-12 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white"
                      placeholder="••••••••"
                      disabled={isChangingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* New Password */}
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="new_password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                      className="w-full pl-10 pr-12 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white"
                      placeholder="••••••••"
                      disabled={isChangingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Password must be at least 6 characters long.
                  </p>
                </div>
                
                {/* Confirm New Password */}
                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      id="confirm_password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white"
                      placeholder="••••••••"
                      disabled={isChangingPassword}
                    />
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="flex justify-end pt-6 border-t border-white/10">
                  <GlossyButton
                    type="submit"
                    loading={isChangingPassword}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                  </GlossyButton>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {/* Connections Tab Content */}
        {activeTab === 'connections' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-2"
          >
            <GlassCard className="p-8">
              <h2 className="text-xl font-semibold text-neon-green mb-6">
                Connected Services
              </h2>
              
              <div className="space-y-6">
                {/* GitHub Connection */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Github className="w-8 h-8 text-gray-900 dark:text-white mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">GitHub</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {hasGithubConnection 
                          ? `Connected${user?.github_username ? ` as ${user.github_username}` : ''}` 
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  
                  <GlossyButton 
                    size="sm" 
                    variant={hasGithubConnection ? 'outline' : 'primary'}
                    onClick={handleConnectGithub}
                    disabled={isConnectingGithub}
                  >
                    {hasGithubConnection ? 'Reconnect' : 'Connect'}
                  </GlossyButton>
                </div>
                
                {/* Netlify Connection */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Code className="w-8 h-8 text-gray-900 dark:text-white mr-3" />
                     <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Netlify</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {hasNetlifyConnection 
                          ? `Connected${user?.netlify_site_name ? ` as ${user.netlify_site_name}` : ''}`
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  
                  <GlossyButton 
                    size="sm"
                    variant={hasNetlifyConnection ? 'outline' : 'primary'}
                    onClick={handleConnectNetlify}
                    disabled={isConnectingNetlify}
                  >
                    {isConnectingNetlify ? 'Connecting...' : (hasNetlifyConnection ? 'Reconnect' : 'Connect')}
                  </GlossyButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};
