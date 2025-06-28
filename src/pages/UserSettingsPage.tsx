import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Loader2, AlertCircle, CheckCircle, Github, Code } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { AuthService } from '../lib/auth';
import { DeploymentService } from '../lib/api';
import { supabase } from '../lib/supabase';

export const UserSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, refetch: refetchUser } = useAuth();
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isConnectingNetlify, setIsConnectingNetlify] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // OAuth connection states
  const [hasGithubConnection, setHasGithubConnection] = useState(false);
  const [hasNetlifyConnection, setHasNetlifyConnection] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      setUsername(user.username || ''); // Pre-fill with existing username
      
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({ type: 'error', text: 'You must be logged in to update settings.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const updatedUser = await AuthService.updateProfile({ username });
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            User Settings
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Manage your profile information
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <GlassCard className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                    placeholder="Enter your username"
                    disabled={isSubmitting}
                  />
                </div>
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

              {/* Message Display */}
              {message && (
                <div className={`p-4 rounded-lg border ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                }`}>
                  <div className="flex items-center space-x-3">
                    {message.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                    <p className={`text-sm ${
                      message.type === 'success'
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {message.text}
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
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
                    <span>Save Changes</span>
                  )}
                </GlossyButton>
              </div>
            </form>
          </GlassCard>
        </motion.div>

        {/* Connected Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-8"
        >
          <GlassCard className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
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
      </div>
    </div>
  );
};
