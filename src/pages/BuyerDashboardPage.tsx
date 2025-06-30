import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Download, Star, Calendar, CreditCard, Bell, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { APIService } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import type { Download as DownloadType } from '../types';

export const BuyerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading, plan } = useSubscription();
  const [downloads, setDownloads] = useState<DownloadType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const userDownloads = await APIService.getUserDownloads(user!.id);
      setDownloads(userDownloads);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please sign in to access your dashboard
          </h1>
          <Link to="/auth">
            <GlossyButton>
              Sign In
            </GlossyButton>
          </Link>
        </div>
      </div>
    );
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
            Welcome back, {user.username || user.email}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your subscription and access your downloaded MVPs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Subscription Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                    Subscription Status
                  </h2>
                  {plan && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${
                      plan.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {plan.isActive ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span>{plan.isActive ? 'Active' : 'Inactive'}</span>
                    </span>
                  )}
                </div>

                {subscriptionLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  </div>
                ) : plan ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Plan details */}
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Current Plan</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {plan.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {plan.description}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Download Quota</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          <span className="text-neon-green">{user.downloads_remaining}</span> / {plan.name === 'Basic' ? '5' : plan.name === 'Pro' ? '15' : '35'} remaining
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Resets {user.last_quota_reset_at ? 
                            formatDistanceToNow(new Date(user.last_quota_reset_at), { addSuffix: true }) 
                            : 'monthly'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Status</p>
                        <div className="flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${plan.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Next Billing</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {plan.currentPeriodEnd ? plan.currentPeriodEnd.toLocaleDateString() : 'N/A'}
                        </p>
                        {plan.cancelAtPeriodEnd && (
                          <p className="text-sm text-orange-600 dark:text-orange-400">
                            Cancels at period end
                          </p>
                        )}
                      </div>
                    </div>
                    {plan.paymentMethod && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Payment Method</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {plan.paymentMethod}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      You don't have an active subscription
                    </p>
                    <Link to="/pricing">
                      <GlossyButton>
                        Choose a Plan
                      </GlossyButton>
                    </Link>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Downloads History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <GlassCard className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Download className="w-5 h-5 mr-2 text-blue-600" />
                  My Downloads
                </h2>

                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="animate-pulse flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : downloads.length > 0 ? (
                  <div className="space-y-4">
                    {downloads.map((download) => (
                      <div
                        key={download.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
                      >
                        <div className="flex items-center space-x-4">
                          <img
                            src={download.mvps?.preview_images?.[0] || 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=100'}
                            alt={download.mvps?.title || 'MVP'}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {download.mvps?.title || 'Unknown MVP'}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Downloaded on {new Date(download.downloaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Link to={download.mvps?.id ? `/mvp/${download.mvps.id}` : '#'}>
                          <GlossyButton
                            size="sm"
                            variant="outline"
                          >
                            View Details
                          </GlossyButton>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      You haven't downloaded any MVPs yet
                    </p>
                    <Link to="/mvps">
                      <GlossyButton>
                        Browse MVPs
                      </GlossyButton>
                    </Link>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link to="/mvps" className="block w-full">
                    <GlossyButton
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Browse MVPs
                    </GlossyButton>
                  </Link>
                  <Link to="/pricing" className="block w-full">
                    <GlossyButton
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </GlossyButton>
                  </Link>
                  <Link to="/support" className="block w-full">
                    <GlossyButton
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Get Support
                    </GlossyButton>
                  </Link>
                </div>
              </GlassCard>
            </motion.div>

            {/* Account Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Account Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Role</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{user.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Member Since</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
