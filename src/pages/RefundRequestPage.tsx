import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Calendar,
  Clock,
  ChevronRight
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { RefundService } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import type { RefundRequest } from '../types';

export const RefundRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  
  // Form data for new refund request
  const [formData, setFormData] = useState({
    subscriptionId: '',
    reason: '',
    amountRequested: ''
  });
  
  // Get subscription ID from query params if provided
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const subId = params.get('subscriptionId');
    if (subId) {
      setFormData(prev => ({ ...prev, subscriptionId: subId }));
    }
  }, [location]);
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    loadData();
  }, [user, navigate]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch subscriptions
      const { data: userSubscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          id, 
          plan_type, 
          stripe_subscription_id, 
          status,
          current_period_start,
          current_period_end
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (subError) {
        console.error('Error fetching subscriptions:', subError);
        throw new Error('Failed to load subscription data');
      }
      
      setSubscriptions(userSubscriptions || []);
      
      // Fetch existing refund requests
      const userRefundRequests = await RefundService.getUserRefundRequests(user!.id);
      setRefundRequests(userRefundRequests);
      
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
  };
  
  const validateForm = (): boolean => {
    if (!formData.subscriptionId) {
      setError('Please select a subscription');
      return false;
    }
    
    if (!formData.reason) {
      setError('Please provide a reason for the refund');
      return false;
    }
    
    if (!formData.amountRequested || parseFloat(formData.amountRequested) <= 0) {
      setError('Please enter a valid amount greater than zero');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit a refund request');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      
      const result = await RefundService.submitRefundRequest({
        userId: user.id,
        subscriptionId: formData.subscriptionId,
        reason: formData.reason,
        amountRequested: parseFloat(formData.amountRequested)
      });
      
      if (result.success) {
        setSuccess(result.message);
        setFormData({
          subscriptionId: '',
          reason: '',
          amountRequested: ''
        });
        
        // Refresh refund requests
        const updatedRefundRequests = await RefundService.getUserRefundRequests(user.id);
        setRefundRequests(updatedRefundRequests);
        
        // Switch to history tab
        setActiveTab('history');
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      console.error('Error submitting refund request:', err);
      setError(err.message || 'Failed to submit refund request');
    } finally {
      setSubmitting(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'processed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processed':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
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
              Refund Requests
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Submit and track your subscription refund requests
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
              New Request
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'history' 
                  ? 'bg-neon-green text-midnight-900' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-neon-green dark:hover:text-neon-green'
              }`}
              onClick={() => setActiveTab('history')}
            >
              Request History
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
                Submit a Refund Request
              </h2>
              
              {subscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Active Subscriptions
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    You don't have any active subscriptions eligible for refunds.
                  </p>
                  <GlossyButton onClick={() => navigate('/pricing')}>
                    View Subscription Plans
                  </GlossyButton>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Select Subscription */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subscription
                    </label>
                    <select
                      value={formData.subscriptionId}
                      onChange={(e) => handleInputChange('subscriptionId', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white"
                      disabled={submitting}
                    >
                      <option value="">Select a subscription</option>
                      {subscriptions.map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1)} Plan - {sub.status}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Subscription Details */}
                  {formData.subscriptionId && (
                    <div className="p-4 bg-white/5 dark:bg-midnight-800/20 rounded-lg border border-white/10">
                      {subscriptions.filter(sub => sub.id === formData.subscriptionId).map(sub => (
                        <div key={sub.id} className="flex flex-col space-y-3">
                          <div className="flex items-center">
                            <CreditCard className="w-5 h-5 text-neon-green mr-2" />
                            <span className="text-sm">
                              <span className="font-medium text-white">Plan:</span>{' '}
                              {sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-5 h-5 text-neon-green mr-2" />
                            <span className="text-sm">
                              <span className="font-medium text-white">Status:</span>{' '}
                              {sub.status}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-5 h-5 text-neon-green mr-2" />
                            <span className="text-sm">
                              <span className="font-medium text-white">Current Period:</span>{' '}
                              {new Date(sub.current_period_start).toLocaleDateString()} to{' '}
                              {new Date(sub.current_period_end).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reason for Refund
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                      placeholder="Please provide a detailed explanation for your refund request..."
                      disabled={submitting}
                    />
                  </div>
                  
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Refund Amount ($)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        value={formData.amountRequested}
                        onChange={(e) => handleInputChange('amountRequested', e.target.value)}
                        step="0.01"
                        min="0.01"
                        className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                        placeholder="0.00"
                        disabled={submitting}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter the amount you would like to be refunded.
                    </p>
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
                      Submit Refund Request
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
                Your Refund Requests
              </h2>
              
              {refundRequests.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Refund Requests
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    You haven't submitted any refund requests yet.
                  </p>
                  <GlossyButton onClick={() => setActiveTab('new')}>
                    Submit a Request
                  </GlossyButton>
                </div>
              ) : (
                <div className="space-y-6">
                  {refundRequests.map((request) => (
                    <div key={request.id} className="border border-white/10 rounded-xl p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                        <div className="flex items-center mb-2 md:mb-0">
                          <div className="bg-midnight-700 p-2 rounded-lg mr-3">
                            <DollarSign className="w-6 h-6 text-neon-green" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              ${request.amount_requested.toFixed(2)}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {new Date(request.created_at).toLocaleDateString()}
                              {' · '}
                              {request.subscription?.plan_type ? (
                                <span className="capitalize">{request.subscription.plan_type} Plan</span>
                              ) : (
                                'Subscription'
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="text-sm font-medium capitalize">{request.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-white/5 dark:bg-midnight-800/20 rounded-lg mb-4">
                        <h4 className="text-sm font-medium text-white mb-2">Reason:</h4>
                        <p className="text-gray-300 text-sm">{request.reason}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>
                            Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {request.processed_at && (
                          <div className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span>
                              Processed {formatDistanceToNow(new Date(request.processed_at), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
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