// src/pages/GitHubAppCallbackPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, Github } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GitHubService } from '../lib/api';
import { useAuth } from '../hooks/useAuth'; // Import useAuth

export const GitHubAppCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refetch: refetchUser } = useAuth(); // Get refetch function for user profile
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [redirectPath, setRedirectPath] = useState<string>('/my-mvps'); // Default redirect
  const [navigationTrigger, setNavigationTrigger] = useState<boolean>(false); // New state to trigger navigation
  const hasNavigated = useRef(false); // Ref to prevent multiple navigations

  useEffect(() => {
    console.log("GitHubAppCallbackPage: Component mounted or searchParams changed.");
    const code = searchParams.get('code');
    const installationId = searchParams.get('installation_id');
    const state = searchParams.get('state'); // This should now be our userId

    if (!code || !installationId || !state) {
      console.error("GitHubAppCallbackPage: Missing required parameters.");
      setStatus('error');
      setMessage('Missing required parameters for GitHub App installation.');
      setNavigationTrigger(true); // Trigger navigation even on error
      return;
    }

    const userId = state; // Changed from mvpId to userId
    // The redirect path should ideally be to the user's dashboard or a confirmation page
    // For now, we'll redirect to /my-mvps as it's a common seller page.
    setRedirectPath(`/my-mvps`); // Changed redirect path

    const completeInstallation = async () => {
      console.log("GitHubAppCallbackPage: Starting completeInstallation process.");
      try {
        const result = await GitHubService.completeGitHubAppInstallation(
          code,
          parseInt(installationId, 10),
          userId // Pass userId here
        );

        if (result.success) {
          console.log("GitHubAppCallbackPage: GitHub App installation successful. Refetching user...");
          setStatus('success');
          setMessage(result.message || 'GitHub App installed and linked successfully!');
          await refetchUser(); // Refetch user profile to update installation ID
          console.log("GitHubAppCallbackPage: User refetched. Setting navigation trigger.");
          setNavigationTrigger(true); // Trigger navigation
        } else {
          console.error("GitHubAppCallbackPage: GitHub App installation failed:", result.message);
          setStatus('error');
          setMessage(result.message || 'Failed to complete GitHub App installation.');
          setNavigationTrigger(true); // Trigger navigation even on error
        }
      } catch (err: any) {
        console.error('GitHubAppCallbackPage: An unexpected error occurred during installation:', err);
        setStatus('error');
        setMessage(err.message || 'An unexpected error occurred during installation.');
        setNavigationTrigger(true); // Trigger navigation even on error
      }
    };

    completeInstallation();
  }, [searchParams, refetchUser]); // Removed navigate and redirectPath from dependencies to avoid re-runs

  // Separate useEffect for navigation
  useEffect(() => {
    if (navigationTrigger && !hasNavigated.current) {
      console.log(`GitHubAppCallbackPage: Navigation triggered. Redirecting to ${redirectPath} in 3 seconds.`);
      hasNavigated.current = true; // Mark as navigated
      const timer = setTimeout(() => {
        navigate(redirectPath);
      }, 3000); // Redirect after a short delay to allow user to read message
      return () => clearTimeout(timer); // Cleanup timer
    }
  }, [navigationTrigger, navigate, redirectPath]);

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <GlassCard className="p-8 text-center max-w-md">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Completing GitHub App Installation...
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Please wait, we are securely linking your repository.
              </p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Success!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {message}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Redirecting you shortly...
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Installation Failed
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {message}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You will be redirected. Please try again or contact support.
              </p>
            </>
          )}
          <div className="mt-6">
            <Github className="w-8 h-8 text-gray-400 mx-auto" />
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
