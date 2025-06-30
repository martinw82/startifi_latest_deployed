import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  Clock,
  FileText,
  ChevronLeft,
  MessageSquare,
  Package,
  ArrowUpRight
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { DisputeService } from '../lib/api';
import type { Dispute } from '../types';
import { formatDistanceToNow } from 'date-fns';

export const DisputeDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { disputeId } = useParams<{ disputeId: string }>();
  const { user } = useAuth();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!disputeId) {
      navigate('/disputes');
      return;
    }
    
    loadDispute();
  }, [user, navigate, disputeId]);
  
  const loadDispute = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const disputeData = await DisputeService.getDisputeById(disputeId!);
      
      if (!disputeData) {
        throw new Error('Dispute not found');
      }
      
      // Check if user is involved in the dispute
      if (disputeData.buyer_id !== user?.id && disputeData.seller_id !== user?.id && user?.role !== 'admin' && user?.role !== 'both') {
        throw new Error('You do not have permission to view this dispute');
      }
      
      setDispute(disputeData);
      
    } catch (err: any) {
      console.error('Error loading dispute:', err);
      setError(err.message || 'An error occurred while loading dispute');
    } finally {
      setLoading(false);
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
  
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'open':
        return 'Open - Awaiting Review';
      case 'in_review':
        return 'In Review';
      case 'resolved_buyer':
        return 'Resolved in favor of Buyer';
      case 'resolved_seller':
        return 'Resolved in favor of Seller';
      case 'closed_no_action':
        return 'Closed - No Action Taken';
      default:
        return status.replace(/_/g, ' ');
    }
  };
  
  const isResolved = (status: string): boolean => {
    return ['resolved_buyer', 'resolved_seller', 'closed_no_action'].includes(status);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-neon-green mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading dispute details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !dispute) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {error || 'Dispute not found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We couldn't find the dispute you're looking for.
          </p>
          <Link to="/dispute">
            <GlossyButton>
              View All Disputes
            </GlossyButton>
          </Link>
        </GlassCard>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link to="/dispute" className="inline-flex items-center text-neon-green hover:text-neon-cyan transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span>Back to Disputes</span>
          </Link>
        </div>
        
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <GlassCard className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-neon-green mr-3" />
                  <h1 className="text-2xl font-bold text-white">
                    Dispute: {dispute.mvp?.title || 'Unknown MVP'}
                  </h1>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-6">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-neon-cyan" />
                    <span>Opened {formatDistanceToNow(new Date(dispute.opened_at), { addSuffix: true })}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1 text-neon-cyan" />
                    <span>Dispute ID: {dispute.id.split('-')[0]}...</span>
                  </div>
                  
                  {dispute.resolved_at && (
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1 text-neon-cyan" />
                      <span>Resolved {formatDistanceToNow(new Date(dispute.resolved_at), { addSuffix: true })}</span>
                    </div>
                  )}
                </div>
                
                <div className={`inline-flex items-center px-3 py-1 rounded-full ${getStatusColor(dispute.status)}`}>
                  {dispute.status === 'open' && <AlertTriangle className="w-4 h-4 mr-1" />}
                  {dispute.status === 'in_review' && <Clock className="w-4 h-4 mr-1" />}
                  {dispute.status === 'resolved_buyer' && <CheckCircle className="w-4 h-4 mr-1" />}
                  {dispute.status === 'resolved_seller' && <CheckCircle className="w-4 h-4 mr-1" />}
                  {dispute.status === 'closed_no_action' && <AlertCircle className="w-4 h-4 mr-1" />}
                  <span className="text-sm font-medium">{getStatusText(dispute.status)}</span>
                </div>
              </div>
              
              <div className="w-full md:w-auto">
                {dispute.mvp?.slug && (
                  <Link to={`/mvp/${dispute.mvp.slug}`}>
                    <GlossyButton variant="outline" size="sm" className="w-full md:w-auto">
                      <Package className="w-4 h-4 mr-2" />
                      <span>View MVP</span>
                    </GlossyButton>
                  </Link>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
        
        {/* Dispute Details */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Main Content - Reason and Details */}
          <div className="md:col-span-2">
            <GlassCard className="p-6 h-full">
              <h2 className="text-xl font-semibold text-neon-green mb-4">Dispute Details</h2>
              
              {/* Reason */}
              <div className="mb-6">
                <h3 className="text-sm uppercase text-gray-500 mb-2">Reason for Dispute</h3>
                <p className="text-white text-lg font-medium">{dispute.reason}</p>
              </div>
              
              {/* Details */}
              <div className="mb-6">
                <h3 className="text-sm uppercase text-gray-500 mb-2">Details</h3>
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-gray-300 whitespace-pre-wrap">{dispute.details}</p>
                </div>
              </div>
              
              {/* Resolution Details (if resolved) */}
              {dispute.resolution_details && (
                <div>
                  <h3 className="text-sm uppercase text-gray-500 mb-2">Resolution</h3>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-gray-300 whitespace-pre-wrap">{dispute.resolution_details}</p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
          
          {/* Sidebar - Parties Information */}
          <div>
            <GlassCard className="p-6 h-full">
              <h2 className="text-xl font-semibold text-neon-green mb-4">Dispute Information</h2>
              
              {/* Buyer */}
              <div className="mb-6">
                <h3 className="text-sm uppercase text-gray-500 mb-2">Buyer</h3>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-midnight-700 flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-neon-green" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {dispute.buyer?.username ? `@${dispute.buyer.username}` : dispute.buyer?.email || 'Unknown Buyer'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {dispute.buyer_id === user?.id ? '(You)' : ''}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Seller */}
              <div className="mb-6">
                <h3 className="text-sm uppercase text-gray-500 mb-2">Seller</h3>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-midnight-700 flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-neon-green" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {dispute.seller?.username ? `@${dispute.seller.username}` : dispute.seller?.email || 'Unknown Seller'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {dispute.seller_id === user?.id ? '(You)' : ''}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Timeline */}
              <div>
                <h3 className="text-sm uppercase text-gray-500 mb-2">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="mt-1 mr-3 w-5 h-5 rounded-full bg-neon-green flex items-center justify-center">
                      <Clock className="w-3 h-3 text-midnight-900" />
                    </div>
                    <div>
                      <p className="text-white text-sm">Dispute Opened</p>
                      <p className="text-xs text-gray-400">
                        {new Date(dispute.opened_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {dispute.status === 'in_review' && (
                    <div className="flex items-start">
                      <div className="mt-1 mr-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <FileText className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-sm">Under Review</p>
                        <p className="text-xs text-gray-400">
                          Our team is reviewing the dispute
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {dispute.resolved_at && (
                    <div className="flex items-start">
                      <div className="mt-1 mr-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-sm">Dispute Resolved</p>
                        <p className="text-xs text-gray-400">
                          {new Date(dispute.resolved_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Contact Support */}
              {!isResolved(dispute.status) && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <GlossyButton 
                    variant="outline"
                    className="w-full flex items-center justify-center"
                    onClick={() => navigate('/support')}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span>Contact Support</span>
                  </GlossyButton>
                </div>
              )}
            </GlassCard>
          </div>
        </motion.div>
        
        {/* Next Steps */}
        {!isResolved(dispute.status) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-neon-green mb-4">Next Steps</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-neon-green/20 rounded-full flex items-center justify-center mr-3">
                    <span className="text-neon-green font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Review in Progress</p>
                    <p className="text-gray-400">
                      Our team will review your dispute within 2-3 business days. We may contact you for additional information.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-neon-green/20 rounded-full flex items-center justify-center mr-3">
                    <span className="text-neon-green font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Seller Response</p>
                    <p className="text-gray-400">
                      The seller will be given an opportunity to respond to your dispute. This helps us understand both sides of the issue.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-neon-green/20 rounded-full flex items-center justify-center mr-3">
                    <span className="text-neon-green font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Resolution</p>
                    <p className="text-gray-400">
                      Once we have all the necessary information, we'll make a decision and update the status of your dispute. You'll be notified via email.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-gray-400 text-sm mb-4">
                  Have questions about the dispute process?
                </p>
                <Link to="/support">
                  <GlossyButton variant="outline" size="sm" className="mx-auto">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span>Contact Support</span>
                  </GlossyButton>
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};