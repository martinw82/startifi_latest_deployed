import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Loader2,
  AlertCircle,
  CheckCircle,
  PackageOpen,
  User,
  Clock,
  FileText,
  ChevronRight,
  Package
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { DisputeService, APIService } from '../lib/api';
import type { MVP, Dispute } from '../types';
import { supabase } from '../lib/supabase';

export const DisputePage: React.FC = () => {
  const navigate = useNavigate();
  const { mvpId } = useParams<{ mvpId?: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mvps, setMvps] = useState<MVP[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedMvp, setSelectedMvp] = useState<MVP | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  
  // Form data for new dispute
  const [formData, setFormData] = useState({
    mvpId: mvpId || '',
    reason: '',
    details: ''
  });
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    loadData();
  }, [user, navigate, mvpId]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch downloaded MVPs
      const { data: downloads, error: downloadError } = await supabase
        .from('downloads')
        .select(`
          id, 
          mvp_id, 
          downloaded_at,
          mvps(
            id, 
            title, 
            seller_id, 
            slug, 
            version_number, 
            preview_images
          )
        `)
        .eq('user_id', user!.id)
        .order('downloaded_at', { ascending: false });
      
      if (downloadError) {
        console.error('Error fetching downloads:', downloadError);
        throw new Error('Failed to load download data');
      }
      
      // Extract unique MVPs from downloads
      const uniqueMvps = new Map();
      downloads?.forEach(download => {
        if (download.mvps && !uniqueMvps.has(download.mvps.id)) {
          uniqueMvps.set(download.mvps.id, {
            ...download.mvps,
            downloaded_at: download.downloaded_at
          });
        }
      });
      
      const userMvps = Array.from(uniqueMvps.values());
      setMvps(userMvps);
      
      // If mvpId is provided in URL, select that MVP
      if (mvpId) {
        const selectedMvp = userMvps.find(mvp => mvp.id === mvpId);
        if (selectedMvp) {
          setSelectedMvp(selectedMvp);
          setFormData(prev => ({ ...prev, mvpId }));
        }
      }
      
      // Fetch existing disputes
      const userDisputes = await DisputeService.getUserDisputes(user!.id);
      setDisputes(userDisputes);
      
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors/success when form changes
    setError(null);
    setSuccess(null);
    
    // If MVP is selected, get its details
    if (field === 'mvpId' && value) {
      const mvp = mvps.find(m => m.id === value);
      if (mvp) {
        setSelectedMvp(mvp);
      } else {
        setSelectedMvp(null);
      }
    }
  };
  
  const validateForm = (): boolean => {
    if (!formData.mvpId) {
      setError('Please select an MVP');
      return false;
    }
    
    if (!formData.reason) {
      setError('Please provide a reason for the dispute');
      return false;
    }
    
    if (!formData.details || formData.details.length < 20) {
      setError('Please provide more details about the issue (minimum 20 characters)');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit a dispute');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      
      if (!selectedMvp) {
        throw new Error('No MVP selected');
      }
      
      const result = await DisputeService.submitDispute({
        buyerId: user.id,
        sellerId: selectedMvp.seller_id,
        mvpId: formData.mvpId,
        reason: formData.reason,
        details: formData.details
      });
      
      if (result.success) {
        setSuccess(result.message);
        setFormData({
          mvpId: '',
          reason: '',
          details: ''
        });
        setSelectedMvp(null);
        
        // Refresh disputes
        const updatedDisputes = await DisputeService.getUserDisputes(user.id);
        setDisputes(updatedDisputes);
        
        // Switch to history tab
        setActiveTab('history');
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      console.error('Error submitting dispute:', err);
      setError(err.message || 'Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved_buyer':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'resolved_seller':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'closed_no_action':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'in_review':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: // open
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved_buyer':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'resolved_seller':
        return <CheckCircle className="w-5 h-5 text-purple-500" />;
      case 'closed_no_action':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
      case 'in_review':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default: // open
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-neon-green mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            <span className="bg-gradient-to-r from-neon-green to-neon-cyan bg-clip-text text-transparent">
              Dispute Resolution
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Submit and track disputes for purchased MVPs
          </p>
        </motion.div>
        
        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-1 inline-flex">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'new' 
                  ? 'bg-neon-green text-midnight-900' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-neon-green dark:hover:text-neon-green'
              }`}
              onClick={() => setActiveTab('new')}
            >
              New Dispute
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'history' 
                  ? 'bg-neon-green text-midnight-900' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-neon-green dark:hover:text-neon-green'
              }`}
              onClick={() => setActiveTab('history')}
            >
              Dispute History
            </button>
          </div>
        </div>
        
        {activeTab === 'new' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Submit a Dispute
              </h2>
              
              {mvps.length === 0 ? (
                <div className="text-center py-8">
                  <PackageOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No MVPs Available for Dispute
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    You haven't downloaded any MVPs yet. You need to have purchased and downloaded an MVP to file a dispute.
                  </p>
                  <GlossyButton onClick={() => navigate('/mvps')}>
                    Browse MVPs
                  </GlossyButton>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Select MVP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select MVP
                    </label>
                    <select
                      value={formData.mvpId}
                      onChange={(e) => handleInputChange('mvpId', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white"
                      disabled={submitting || !!mvpId} // Disable if mvpId was provided in URL
                    >
                      <option value="">Select an MVP</option>
                      {mvps.map(mvp => (
                        <option key={mvp.id} value={mvp.id}>
                          {mvp.title} (v{mvp.version_number})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* MVP Details */}
                  {selectedMvp && (
                    <div className="p-4 bg-white/5 dark:bg-midnight-800/20 rounded-lg border border-white/10">
                      <div className="flex items-center space-x-3 mb-3">
                        <img 
                          src={selectedMvp.preview_images[0] || 'https://via.placeholder.com/60'} 
                          alt={selectedMvp.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <h4 className="font-medium text-white">{selectedMvp.title}</h4>
                          <p className="text-xs text-gray-400">Version {selectedMvp.version_number}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center text-gray-300">
                          <Package className="w-4 h-4 text-neon-green mr-2" />
                          <span>Downloaded on {new Date(selectedMvp.downloaded_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Dispute Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reason for Dispute
                    </label>
                    <select
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white"
                      disabled={submitting}
                    >
                      <option value="">Select a reason</option>
                      <option value="Non-functioning code">Non-functioning code</option>
                      <option value="Missing features">Missing features</option>
                      <option value="Incompatible with advertised platforms">Incompatible with advertised platforms</option>
                      <option value="Security vulnerabilities">Security vulnerabilities</option>
                      <option value="Misrepresented functionality">Misrepresented functionality</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  {/* Dispute Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dispute Details
                    </label>
                    <textarea
                      value={formData.details}
                      onChange={(e) => handleInputChange('details', e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                      placeholder="Please provide detailed information about the issue, including specific examples, error messages, and steps to reproduce the problem..."
                      disabled={submitting}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Minimum 20 characters. Include as much detail as possible to help us resolve your dispute.
                    </p>
                  </div>
                  
                  {/* Dispute Policy Information */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Dispute Policy</h4>
                    <ul className="text-xs text-blue-700 dark:text-blue-400 list-disc list-inside space-y-1">
                      <li>Our team will review your dispute within 2-3 business days</li>
                      <li>The seller will be notified and given an opportunity to respond</li>
                      <li>We may request additional information or evidence</li>
                      <li>Disputes are resolved on a case-by-case basis according to our terms of service</li>
                      <li>Submitting false claims may result in account restrictions</li>
                    </ul>
                  </div>
                  
                  {/* Error/Success Message */}
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                      </div>
                    </div>
                  )}
                  
                  {success && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Submit Button */}
                  <div className="pt-4 border-t border-white/10 flex justify-end">
                    <GlossyButton
                      type="submit"
                      disabled={submitting}
                      loading={submitting}
                    >
                      Submit Dispute
                    </GlossyButton>
                  </div>
                </form>
              )}
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Your Disputes
              </h2>
              
              {disputes.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Disputes
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    You haven't submitted any disputes yet.
                  </p>
                  <GlossyButton onClick={() => setActiveTab('new')}>
                    Create a Dispute
                  </GlossyButton>
                </div>
              ) : (
                <div className="space-y-6">
                  {disputes.map((dispute) => (
                    <Link 
                      key={dispute.id} 
                      to={`/disputes/${dispute.id}`}
                      className="block border border-white/10 rounded-xl p-6 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                        <div className="flex items-start mb-2 md:mb-0">
                          <div className="bg-midnight-700 p-2 rounded-lg mr-3 mt-1">
                            <AlertTriangle className="w-6 h-6 text-neon-green" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white line-clamp-1">
                              Dispute: {dispute.mvp?.title || 'Unknown MVP'}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {new Date(dispute.opened_at).toLocaleDateString()}
                              {' · '}
                              <span className="capitalize">{dispute.reason}</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${getStatusColor(dispute.status)}`}>
                            {getStatusIcon(dispute.status)}
                            <span className="text-sm font-medium capitalize">{dispute.status.replace(/_/g, ' ')}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                      
                      <div className="p-4 bg-white/5 dark:bg-midnight-800/20 rounded-lg mb-4">
                        <p className="text-gray-300 text-sm line-clamp-2">{dispute.details}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          <span>
                            {dispute.buyer?.username ? `@${dispute.buyer.username}` : 'You'} vs. {dispute.seller?.username ? `@${dispute.seller.username}` : 'Seller'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>Opened {new Date(dispute.opened_at).toLocaleDateString()}</span>
                        </div>
                        {dispute.resolved_at && (
                          <div className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span>Resolved {new Date(dispute.resolved_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};