// src/components/mvp/GitHubLinkModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Github,
  Link as LinkIcon,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2,
  Unlink,
  Key,
  Copy,
  RefreshCw,
  DownloadCloud // Added for installation prompt
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlossyButton } from '../ui/GlossyButton';
import { GitHubService } from '../../lib/api';
import type { MVP } from '../../types';
import { useAuth } from '../../hooks/useAuth'; // Import useAuth

interface GitHubLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  mvp: MVP;
  onSuccess: () => void;
}

// Helper function to generate a secure-looking random string
// For production, consider using a cryptographically secure random number generator
// like `crypto.getRandomValues` or a library like `nanoid`.
const generateSecureRandomString = (length = 32) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const GitHubLinkModal: React.FC<GitHubLinkModalProps> = ({
  isOpen,
  onClose,
  mvp,
  onSuccess
}) => {
  const { user } = useAuth(); // Use the auth hook to get user data
  const [formData, setFormData] = useState({
    owner: mvp.github_repo_owner || '',
    repoName: mvp.github_repo_name || ''
  });
  const [webhookSecret, setWebhookSecret] = useState(mvp.github_webhook_secret || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [repoData, setRepoData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Derived states for UI control
  const isRepoConfigured = Boolean(mvp.github_repo_owner && mvp.github_repo_name && mvp.github_webhook_secret);
  // Check if user has github_app_installation_id
  const isAppInstalled = Boolean(user?.github_app_installation_id); // Changed to check user's profile

  // Effect to reset form data and secret when MVP changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        owner: mvp.github_repo_owner || '',
        repoName: mvp.github_repo_name || ''
      });
      setWebhookSecret(mvp.github_webhook_secret || '');
      setMessage(null);
      setRepoData(null);
      setCopied(false);

      // Add console.log statements here as requested
      console.log("GitHubLinkModal: mvp.id:", mvp.id);
      console.log("GitHubLinkModal: user.github_app_installation_id:", user?.github_app_installation_id); // Changed to user's profile
      console.log("GitHubLinkModal: isAppInstalled status:", isAppInstalled);
    }
  }, [isOpen, mvp, isAppInstalled, user?.github_app_installation_id]); // Add user.github_app_installation_id to dependency array

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setMessage(null);
    setRepoData(null);
  };

  const handleGenerateSecret = () => {
    const newSecret = generateSecureRandomString();
    setWebhookSecret(newSecret);
    setCopied(false); // Reset copied state when new secret is generated
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(webhookSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateRepository = async () => {
    if (!formData.owner.trim() || !formData.repoName.trim()) {
      setMessage({ type: 'error', text: 'Please enter both repository owner and name' });
      return;
    }
    if (!user?.id) {
      setMessage({ type: 'error', text: 'User not authenticated.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const validation = await GitHubService.validateGitHubRepository(
        formData.owner.trim(),
        formData.repoName.trim(),
        user.id // Pass user ID for validation
      );

      if (validation.success) {
        setRepoData(validation.repoData);
        setMessage({ type: 'success', text: 'Repository found and accessible!' });
      } else {
        setMessage({ type: 'error', text: validation.message });
        setRepoData(null);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to validate repository' });
      setRepoData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!user?.id) {
      setMessage({ type: 'error', text: 'User not authenticated.' });
      return;
    }

    // Ensure validation has run and passed, or run it now
    if (!repoData) {
      const validation = await GitHubService.validateGitHubRepository(
        formData.owner.trim(),
        formData.repoName.trim(),
        user.id // Pass user ID for validation
      );
      if (!validation.success) {
        setMessage({ type: 'error', text: validation.message });
        return;
      }
      setRepoData(validation.repoData);
    }

    if (!webhookSecret) {
      setMessage({ type: 'error', text: 'Please generate or provide a webhook secret.' });
      return;
    }

    setLoading(true);
    setMessage(null); // Clear previous messages

    try {
      const result = await GitHubService.linkGitHubRepository(
        mvp.id,
        user.id, // Pass user ID here
        formData.owner.trim(),
        formData.repoName.trim(),
        webhookSecret // Pass the webhook secret
      );

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        // No redirect here, as the app is already installed.
        // The linkGitHubRepository function in api.ts will no longer return githubAppInstallUrl
        // when the app is already installed.
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to link repository' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink this GitHub repository? Automatic updates will be disabled.')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await GitHubService.unlinkGitHubRepository(mvp.id);

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to unlink repository' });
    } finally {
      setLoading(false);
    }
  };

  const handleInstallGitHubApp = async () => {
    if (!user?.id) {
      setMessage({ type: 'error', text: 'User not authenticated. Please log in.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      // This will construct the GitHub App installation URL and redirect
      const githubAppSlug = import.meta.env.VITE_GITHUB_APP_SLUG;
      if (!githubAppSlug) {
        throw new Error('VITE_GITHUB_APP_SLUG is not set in environment variables.');
      }
      const installUrl = `https://github.com/apps/${githubAppSlug}/installations/new?state=${user.id}`;
      window.location.href = installUrl;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to initiate GitHub App installation.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <GlassCard className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
                  <Github className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isAppInstalled ? 'Link GitHub Repository' : 'Install GitHub App'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {isAppInstalled ? 'Enable automatic updates from GitHub' : 'Connect your GitHub account to enable integrations'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!isAppInstalled ? (
              // UI for installing GitHub App
              <div className="text-center py-8">
                <DownloadCloud className="w-20 h-20 text-blue-600 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  GitHub App Not Installed
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  To link your MVP to a GitHub repository and enable automatic updates, you first need to install our GitHub App. This grants us the necessary permissions to access your repositories.
                </p>
                <GlossyButton
                  onClick={handleInstallGitHubApp}
                  disabled={loading}
                  className="flex items-center justify-center mx-auto space-x-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Github className="w-4 h-4" />
                  )}
                  <span>Install GitHub App</span>
                </GlossyButton>
                {message && (
                  <div className={`mt-4 p-3 rounded-lg border ${
                    message.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                  }`}>
                    <p className={`text-sm ${
                      message.type === 'success'
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {message.text}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // UI for linking repository (when app is installed)
              <>
                {/* Current Link Status */}
                {isRepoConfigured && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800 dark:text-green-200">
                          Repository Configured: {mvp.github_repo_owner}/{mvp.github_repo_name}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          GitHub App Status: Installed
                        </p>
                        {mvp.last_synced_github_commit_sha && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Last synced: {mvp.last_synced_github_commit_sha.substring(0, 7)}
                          </p>
                        )}
                      </div>
                      {mvp.github_repo_owner && mvp.github_repo_name && (
                        <a
                          href={`https://github.com/${mvp.github_repo_owner}/${mvp.github_repo_name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Form */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Repository Owner
                      </label>
                      <input
                        type="text"
                        value={formData.owner}
                        onChange={(e) => handleInputChange('owner', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                        placeholder="username or organization"
                        disabled={loading} // Only disable if loading, not if app is installed
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Repository Name
                      </label>
                      <input
                        type="text"
                        value={formData.repoName}
                        onChange={(e) => handleInputChange('repoName', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                        placeholder="repository-name"
                        disabled={loading} // Only disable if loading, not if app is installed
                      />
                    </div>
                  </div>

                  {/* Repository Info */}
                  {repoData && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-medium text-blue-900 dark:text-blue-100">
                            {repoData.full_name}
                          </h3>
                          {repoData.description && (
                            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                              {repoData.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-blue-700 dark:text-blue-300">
                            <span>★ {repoData.stargazers_count}</span>
                            <span>⑂ {repoData.forks_count}</span>
                            <span className={`px-2 py-1 rounded-full ${
                              repoData.private
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                              {repoData.private ? 'Private' : 'Public'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Webhook Secret Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Webhook Secret *
                    </label>
                    <div className="relative flex items-center">
                      <Key className="absolute left-3 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        className="w-full pl-10 pr-24 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                        placeholder="Generate or paste your secret"
                        disabled={loading} // Only disable if loading
                      />
                      <div className="absolute right-2 flex space-x-1">
                        <GlossyButton
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleGenerateSecret}
                          disabled={loading}
                          className="px-2 py-1 text-xs"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </GlossyButton>
                        <GlossyButton
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleCopySecret}
                          disabled={loading || !webhookSecret}
                          className="px-2 py-1 text-xs"
                        >
                          {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </GlossyButton>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This secret is used to verify GitHub webhook payloads. Keep it secure!
                    </p>
                  </div>

                  {/* Message */}
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

                  {/* Webhook Setup Instructions */}
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                          Webhook Setup Required
                        </h3>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                          After linking, you'll need to set up a GitHub webhook for automatic updates:
                        </p>
                        <ol className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 ml-4 list-decimal">
                          <li>Go to your repository's Settings → Webhooks</li>
                          <li>Add webhook URL: <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
                            {window.location.origin}/api/webhooks/github
                          </code></li>
                          <li>Set content type to "application/json"</li>
                          <li>Paste the generated secret into the "Secret" field</li>
                          <li>Select "Just the push event" and "Releases" events</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-6 border-t border-white/20 mt-8">
                  <div>
                    {isRepoConfigured && ( // Only show unlink if repo details are configured
                      <GlossyButton
                        variant="outline"
                        onClick={handleUnlink}
                        disabled={loading}
                        className="flex items-center space-x-2 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Unlink className="w-4 h-4" />
                        <span>Unlink Repository</span>
                      </GlossyButton>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <GlossyButton
                      variant="outline"
                      onClick={onClose}
                      disabled={loading}
                    >
                      Cancel
                    </GlossyButton>

                    <GlossyButton
                      variant="outline"
                      onClick={validateRepository}
                      disabled={loading || !formData.owner.trim() || !formData.repoName.trim()}
                      className="flex items-center space-x-2"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Github className="w-4 h-4" />
                      )}
                      <span>Validate</span>
                    </GlossyButton>

                    <GlossyButton
                      onClick={handleLink}
                      disabled={loading || !repoData || !webhookSecret}
                      className="flex items-center space-x-2"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LinkIcon className="w-4 h-4" />
                      )}
                      <span>Link Repository</span>
                    </GlossyButton>
                  </div>
                </div>
              </>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
