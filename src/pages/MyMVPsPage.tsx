import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Plus, 
  Edit, 
  Eye, 
  Trash2, 
  Upload,
  Star, 
  Download, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Github,
  GitBranch,
  RefreshCw,
  RotateCw // Icon for retry
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { MVPUploadService } from '../lib/mvpUpload';
import { GitHubLinkModal } from '../components/mvp/GitHubLinkModal';
import type { MVP } from '../types';

export const MyMVPsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mvps, setMvps] = useState<MVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending_review' | 'rejected' | 'scan_failed' | 'ipfs_pin_failed'>('all');
  const [gitHubModalOpen, setGitHubModalOpen] = useState(false);
  const [selectedMVP, setSelectedMVP] = useState<MVP | null>(null);
  const [syncingMVPs, setSyncingMVPs] = useState<Set<string>>(new Set());
  const [retryingMVPs, setRetryingMVPs] = useState<Set<string>>(new Set()); // New state for retrying MVPs

  useEffect(() => {
    if (user) {
      loadMVPs();
    }
  }, [user]);

  const loadMVPs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userMVPs = await MVPUploadService.getUserMVPs(user.id);
      setMvps(userMVPs);
    } catch (error) {
      console.error('Error loading MVPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mvpId: string) => {
    if (!confirm('Are you sure you want to delete this MVP? This action cannot be undone.')) {
      return;
    }

    const result = await MVPUploadService.deleteMVP(mvpId);
    if (result.success) {
      setMvps(prev => prev.filter(mvp => mvp.id !== mvpId));
    } else {
      alert(result.message);
    }
  };

  const handleOpenGitHubModal = (mvp: MVP) => {
    setSelectedMVP(mvp);
    setGitHubModalOpen(true);
  };

  const handleCloseGitHubModal = () => {
    setGitHubModalOpen(false);
    setSelectedMVP(null);
  };

  const handleGitHubSuccess = () => {
    loadMVPs(); // Refresh the MVP list
  };

  const handleSyncFromGitHub = async (mvp: MVP) => {
    if (!mvp.github_repo_owner || !mvp.github_repo_name) return;

    setSyncingMVPs(prev => new Set(prev).add(mvp.id));

    try {
      const result = await MVPUploadService.syncFromGitHub(mvp.id);
      
      if (result.success) {
        alert(result.message);
        loadMVPs(); // Refresh the list
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      console.error('Error syncing from GitHub:', error);
      alert('Failed to sync from GitHub. Please try again.');
    } finally {
      setSyncingMVPs(prev => {
        const newSet = new Set(prev);
        newSet.delete(mvp.id);
        return newSet;
      });
    }
  };

  // New function to handle retry processing
  const handleRetryProcessing = async (mvp: MVP) => {
    setRetryingMVPs(prev => new Set(prev).add(mvp.id));
    try {
      const result = await MVPUploadService.retryProcessing(mvp.id);
      if (result.success) {
        alert(result.message);
        loadMVPs(); // Reload MVPs to reflect status change
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      console.error('Error retrying processing:', error);
      alert('Failed to retry processing. Please try again.');
    } finally {
      setRetryingMVPs(prev => {
        const newSet = new Set(prev);
        newSet.delete(mvp.id);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending_review':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'scan_failed':
        return <AlertCircle className="w-5 h-5 text-orange-500" />; // Distinct icon for scan failed
      case 'ipfs_pin_failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />; // Distinct icon for IPFS failed
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'scan_failed':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'; // Distinct color for scan failed
      case 'ipfs_pin_failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'; // Distinct color for IPFS failed
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const filteredMVPs = mvps.filter(mvp => 
    filter === 'all' || mvp.status === filter
  );

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please sign in to view your MVPs
          </h1>
          <GlossyButton onClick={() => navigate('/auth')}>
            Sign In
          </GlossyButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              My MVPs
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your uploaded MVP templates
            </p>
          </div>
          <Link to="/upload">
            <GlossyButton className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Upload New MVP</span>
            </GlossyButton>
          </Link>
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
                { key: 'all', label: 'All MVPs' },
                { key: 'approved', label: 'Approved' },
                { key: 'pending_review', label: 'Pending Review' },
                { key: 'rejected', label: 'Rejected' },
                { key: 'scan_failed', label: 'Scan Failed' }, // New filter option
                { key: 'ipfs_pin_failed', label: 'IPFS Failed' } // New filter option
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

          {/* GitHub Link Modal */}
          {selectedMVP && (
            <GitHubLinkModal
              isOpen={gitHubModalOpen}
              onClose={handleCloseGitHubModal}
              mvp={selectedMVP}
              onSuccess={handleGitHubSuccess}
            />
          )}
        </motion.div>

        {/* MVPs Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <GlassCard key={index} className="p-6 animate-pulse">
                  <div className="w-full h-48 bg-gray-300 dark:bg-gray-600 rounded-lg mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : filteredMVPs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMVPs.map((mvp, index) => (
                <motion.div
                  key={mvp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                >
                  <GlassCard className="p-6 h-full flex flex-col">
                    {/* Preview Image */}
                    <div className="relative mb-4 rounded-xl overflow-hidden">
                      <img
                        src={mvp.preview_images[0] || 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=800'}
                        alt={mvp.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(mvp.status)}`}>
                          {getStatusIcon(mvp.status)}
                          <span>{mvp.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {mvp.title}
                      </h3>
                      
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                        {mvp.tagline}
                      </p>

                      {/* Tech Stack */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {mvp.tech_stack.slice(0, 3).map((tech) => (
                          <span
                            key={tech}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
                          >
                            {tech}
                          </span>
                        ))}
                        {mvp.tech_stack.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full">
                            +{mvp.tech_stack.length - 3} more
                          </span>
                        )}
                      </div>

                      {/* GitHub Integration Status */}
                      {mvp.github_repo_owner && mvp.github_repo_name && (
                        <div className="flex items-center space-x-2 mb-2">
                          <Github className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {mvp.github_repo_owner}/{mvp.github_repo_name}
                          </span>
                          {mvp.last_synced_github_commit_sha && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              • {mvp.last_synced_github_commit_sha.substring(0, 7)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium">{mvp.average_rating.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Download className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-500">{mvp.download_count}</span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          v{mvp.version_number}
                        </div>
                      </div>
                    </div>

                    {/* Processing Error Message */}
                    {(mvp.status === 'scan_failed' || mvp.status === 'ipfs_pin_failed') && mvp.last_processing_error && (
                      <div className="mb-4 p-3 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <p className="text-red-800 dark:text-red-200 font-medium">Processing Error:</p>
                        <p className="text-red-700 dark:text-red-300">{mvp.last_processing_error}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-4 border-t border-white/10">
                      {/* GitHub Actions */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenGitHubModal(mvp)}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title={mvp.github_repo_owner ? "Manage GitHub integration" : "Link GitHub repository"}
                        >
                          <Github className="w-4 h-4" />
                        </button>
                        
                        {mvp.github_repo_owner && mvp.github_repo_name && (
                          <button
                            onClick={() => handleSyncFromGitHub(mvp)}
                            disabled={syncingMVPs.has(mvp.id)}
                            className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Sync from GitHub"
                          >
                            <RefreshCw className={`w-4 h-4 ${syncingMVPs.has(mvp.id) ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                      </div>
                      
                      <Link to={`/mvp/${mvp.id}`} className="flex-1">
                        <GlossyButton size="sm" variant="outline" className="w-full flex items-center justify-center space-x-2">
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </GlossyButton>
                      </Link>
                      
                      <Link to={`/mvp/${mvp.id}/edit`} className="flex-1">
                        <GlossyButton size="sm" variant="outline" className="w-full flex items-center justify-center space-x-2">
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </GlossyButton>
                      </Link>
                      
                      <Link to={`/upload?mvpId=${mvp.id}`} className="flex-1">
                        <GlossyButton size="sm" variant="outline" className="w-full flex items-center justify-center space-x-2">
                          <Upload className="w-4 h-4" />
                          <span>New Version</span>
                        </GlossyButton>
                      </Link>

                      {/* Retry Processing Button */}
                      {(mvp.status === 'scan_failed' || mvp.status === 'ipfs_pin_failed') && (
                        <GlossyButton
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetryProcessing(mvp)}
                          disabled={retryingMVPs.has(mvp.id)}
                          className="flex items-center space-x-2 border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50"
                          title="Retry processing"
                        >
                          <RotateCw className={`w-4 h-4 ${retryingMVPs.has(mvp.id) ? 'animate-spin' : ''}`} />
                          <span>Retry</span>
                        </GlossyButton>
                      )}
                      
                      <button
                        onClick={() => handleDelete(mvp.id)}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          ) : (
            <GlassCard className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {filter === 'all' ? 'No MVPs Yet' : `No ${filter.replace('_', ' ')} MVPs`}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                {filter === 'all' 
                  ? "You haven't uploaded any MVPs yet. Start sharing your creations with the developer community!"
                  : `You don't have any MVPs with ${filter.replace('_', ' ')} status.`
                }
              </p>
              {filter === 'all' && (
                <Link to="/upload">
                  <GlossyButton className="flex items-center space-x-2 mx-auto">
                    <Plus className="w-5 h-5" />
                    <span>Upload Your First MVP</span>
                  </GlossyButton>
                </Link>
              )}
            </GlassCard>
          )}
        </motion.div>
      </div>
    </div>
  );
};
