import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, Github } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { DeploymentService } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';


export const BuyerGitHubCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing GitHub authentication...');
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [repoName, setRepoName] = useState<string>('');
  const [showRepoForm, setShowRepoForm] = useState<boolean>(false);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (!code || !state) {
          setStatus('error');
          setMessage('Missing required parameters from GitHub callback.');
          return;
        }
        
        // Process GitHub authentication callback
        const result = await DeploymentService.completeGitHubAuth(code, state);
        
        if (result.success) {
          setStatus('success');
          setMessage('GitHub authentication completed successfully!');
          setGithubUsername(result.github_username || null);
          setMvpId(result.mvp_id || null);
          
          // If there was a deployment in progress, show repo form
          if (result.mvp_id) {
            setShowRepoForm(true);
          }
        } else {
          setStatus('error');
          setMessage(result.message || 'Failed to complete GitHub authentication.');
        }
      } catch (error: any) {
        console.error('Error processing GitHub callback:', error);
        setStatus('error');
        setMessage(error.message || 'An unexpected error occurred.');
      }
    };
    
    processCallback();
  }, [searchParams]);

  const handleRepoSubmit = async () => {
    if (!user || !mvpId || !repoName) {
      setStatus('error');
      setMessage('Missing required information to create repository.');
      return;
    }
    
    setStatus('loading');
    setMessage('Creating GitHub repository...');
    setShowRepoForm(false);
    
    try {
      // First get deployment ID from the database based on user_id and mvp_id
      // (Normally this would be passed in the state, but for this example we'll fetch it)
      const { data: deploymentData, error: deploymentError } = await supabase
        .from('deployments')
        .select('id')
        .eq('user_id', user.id)
        .eq('mvp_id', mvpId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (deploymentError || !deploymentData) {
        throw new Error('Failed to find deployment record. Please try again.');
      }
      
      setDeploymentId(deploymentData.id);
      
      // Create GitHub repo and push MVP code
      const repoResult = await DeploymentService.createRepoAndPushMVP(
        user.id,
        mvpId,
        deploymentData.id,
        repoName
      );
      
      if (!repoResult.success) {
        throw new Error(repoResult.message || 'Failed to create GitHub repository');
      }
      
      setMessage('GitHub repository created! Continuing to Netlify setup...');
      
      // Initiate Netlify authentication
      const netlifyResult = await DeploymentService.initiateNetlifyAuth(
        user.id,
        deploymentData.id,
        repoResult.github_repo_url as string
      );
      
      if (!netlifyResult.success) {
        throw new Error(netlifyResult.message || 'Failed to initiate Netlify authentication');
      }
      
      if (netlifyResult.netlify_auth_url) {
        setMessage('Redirecting to Netlify for authentication...');
        
        // Redirect to Netlify OAuth
        setTimeout(() => {
          window.location.href = netlifyResult.netlify_auth_url as string;
        }, 1500);
      } else {
        throw new Error('No Netlify authentication URL provided.');
      }
      
    } catch (error: any) {
      console.error('Error in repository creation flow:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to create GitHub repository.');
    }
  };
  
  const handleContinue = () => {
    navigate('/dashboard');
  };
  
  const handleRetry = () => {
    if (mvpId) {
      navigate(`/mvp/${mvpId}`);
    } else {
      navigate('/mvps');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {showRepoForm ? 'Create Repository' : 'Connecting to GitHub'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {message}
              </p>
            </>
          )}
          
          {status === 'success' && !showRepoForm && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                GitHub Connected Successfully
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {message}
              </p>
              <GlossyButton onClick={handleContinue}>
                Continue to Dashboard
              </GlossyButton>
            </>
          )}
          
          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Connection Failed
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {message}
              </p>
              <GlossyButton onClick={handleRetry}>
                Try Again
              </GlossyButton>
            </>
          )}
          
          {showRepoForm && (
            <>
              <Github className="w-12 h-12 text-gray-900 dark:text-white mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Create GitHub Repository
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {githubUsername ? `Connected as ${githubUsername}` : 'GitHub connected successfully'}
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left mb-2">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase())}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="my-awesome-project"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-left">
                  Only lowercase letters, numbers, hyphens, and underscores allowed.
                </p>
              </div>
              
              <div className="flex space-x-4">
                <GlossyButton 
                  variant="outline" 
                  onClick={() => navigate(mvpId ? `/mvp/${mvpId}` : '/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </GlossyButton>
                <GlossyButton
                  onClick={handleRepoSubmit}
                  disabled={!repoName}
                  className="flex-1"
                >
                  Create Repository
                </GlossyButton>
              </div>
            </>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};