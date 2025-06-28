import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Github, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Code,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { DeploymentService } from '../lib/api';
import type { Deployment } from '../types';

export const DeploymentsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'in_progress'>('all');

  useEffect(() => {
    if (user) {
      loadDeployments();
    } else {
      // If not logged in, redirect to login
      navigate('/auth');
    }
  }, [user, navigate]);

  const loadDeployments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await DeploymentService.getUserDeployments(user.id);
      
      if (result.success && result.deployments) {
        setDeployments(result.deployments);
      } else {
        setError(result.message || 'Failed to load deployments');
      }
    } catch (error: any) {
      console.error('Error loading deployments:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'initializing':
      case 'creating_repo':
      case 'pushing_code':
      case 'configuring_netlify':
      case 'deploying':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'initializing':
      case 'creating_repo':
      case 'pushing_code':
      case 'configuring_netlify':
      case 'deploying':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'initializing':
        return 'Initializing';
      case 'creating_repo':
        return 'Creating Repository';
      case 'pushing_code':
        return 'Pushing Code';
      case 'configuring_netlify':
        return 'Configuring Netlify';
      case 'deploying':
        return 'Deploying';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const isInProgress = (status: string) => {
    return ['initializing', 'creating_repo', 'pushing_code', 'configuring_netlify', 'deploying'].includes(status);
  };

  const filteredDeployments = deployments.filter(deployment => {
    if (filter === 'all') return true;
    if (filter === 'completed') return deployment.status === 'completed';
    if (filter === 'failed') return deployment.status === 'failed';
    if (filter === 'in_progress') return isInProgress(deployment.status);
    return true;
  });

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            My Deployments
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your deployed MVPs and monitor their status
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <GlassCard className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by status:
              </span>
              {[
                { key: 'all', label: 'All Deployments' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'completed', label: 'Completed' },
                { key: 'failed', label: 'Failed' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Deployments List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-700 dark:text-gray-300">Loading deployments...</span>
            </div>
          ) : error ? (
            <GlassCard className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Error Loading Deployments
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {error}
              </p>
              <GlossyButton onClick={loadDeployments}>
                Retry
              </GlossyButton>
            </GlassCard>
          ) : filteredDeployments.length > 0 ? (
            <div className="space-y-6">
              {filteredDeployments.map((deployment) => (
                <GlassCard key={deployment.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="mb-4 lg:mb-0">
                      <div className="flex items-center mb-2">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mr-3">
                          {deployment.mvps?.title || 'Unnamed Project'}
                        </h2>
                        <span className={`flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(deployment.status)}`}>
                          {getStatusIcon(deployment.status)}
                          <span>{getStatusLabel(deployment.status)}</span>
                        </span>
                      </div>
                      
                      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-6 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-500" />
                          <span>Created: {new Date(deployment.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {deployment.github_repo_url && (
                          <a 
                            href={deployment.github_repo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <Github className="w-4 h-4 mr-1" />
                            <span>GitHub Repository</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                        
                        {deployment.netlify_site_url && (
                          <a 
                            href={deployment.netlify_site_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <Globe className="w-4 h-4 mr-1" />
                            <span>View Live Site</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                      </div>
                      
                      {deployment.error_message && (
                        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                          <p className="font-semibold">Error:</p>
                          <p>{deployment.error_message}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      {deployment.netlify_site_url && (
                        <GlossyButton
                          size="sm"
                          onClick={() => window.open(deployment.netlify_site_url, '_blank')}
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          View Site
                        </GlossyButton>
                      )}
                      
                      {deployment.github_repo_url && (
                        <GlossyButton
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(deployment.github_repo_url, '_blank')}
                        >
                          <Github className="w-4 h-4 mr-2" />
                          View Code
                        </GlossyButton>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard className="p-12 text-center">
              <Code className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                No Deployments Found
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                You haven't deployed any MVPs yet. After downloading an MVP, you can deploy it directly to Netlify with just a few clicks!
              </p>
              <GlossyButton onClick={() => navigate('/mvps')}>
                Browse MVPs
              </GlossyButton>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </div>
  );
};