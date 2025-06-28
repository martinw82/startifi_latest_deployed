import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Upload, DollarSign, Eye, Star, TrendingUp, Package, Plus, Edit } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { MVPUploadService } from '../lib/mvpUpload';
import type { MVP } from '../types';

export const SellerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [mvps, setMvps] = useState<MVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDownloads: 0,
    totalEarnings: 0,
    averageRating: 0,
    activeMVPs: 0,
  });

  useEffect(() => {
    if (user) {
      loadSellerData();
    }
  }, [user]);

  const loadSellerData = async () => {
    try {
      setLoading(true);
      const userMVPs = await MVPUploadService.getUserMVPs(user!.id);
      setMvps(userMVPs);
      
      // Calculate stats
      const totalDownloads = userMVPs.reduce((sum, mvp) => sum + mvp.download_count, 0);
      const totalEarnings = totalDownloads * 2.5; // Assuming $2.50 per download
      const averageRating = userMVPs.length > 0 
        ? userMVPs.reduce((sum, mvp) => sum + mvp.average_rating, 0) / userMVPs.length 
        : 0;
      const activeMVPs = userMVPs.filter(mvp => mvp.status === 'approved').length;
      
      setStats({
        totalDownloads,
        totalEarnings,
        averageRating: averageRating || 0,
        activeMVPs,
      });
    } catch (error) {
      console.error('Error loading seller data:', error);
    } finally {
      setLoading(false);
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
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
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

  if (!user.is_seller_approved) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Seller Approval Pending
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your seller application is currently under review. You'll receive an email notification once approved.
          </p>
          <Link to="/support">
            <GlossyButton>
              Contact Support
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
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {user.username || user.email}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your MVPs and track your earnings
            </p>
          </div>
          <Link to="/upload">
            <GlossyButton className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Upload New MVP</span>
            </GlossyButton>
          </Link>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: 'Total Downloads',
              value: stats.totalDownloads.toLocaleString(),
              icon: TrendingUp,
              color: 'text-blue-600',
            },
            {
              title: 'Total Earnings',
              value: `$${stats.totalEarnings.toFixed(2)}`,
              icon: DollarSign,
              color: 'text-green-600',
            },
            {
              title: 'Average Rating',
              value: stats.averageRating.toFixed(1),
              icon: Star,
              color: 'text-yellow-600',
            },
            {
              title: 'Active MVPs',
              value: stats.activeMVPs.toString(),
              icon: Package,
              color: 'text-purple-600',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* MVPs List */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Package className="w-5 h-5 mr-2 text-blue-600" />
                    My MVPs
                  </h2>
                  <Link to="/my-mvps">
                    <GlossyButton size="sm" variant="outline">
                      View All
                    </GlossyButton>
                  </Link>
                </div>

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
                ) : mvps.length > 0 ? (
                  <div className="space-y-4">
                    {mvps.map((mvp) => (
                      <div
                        key={mvp.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
                      >
                        <div className="flex items-center space-x-4">
                          <img
                            src={mvp.preview_images[0]}
                            alt={mvp.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {mvp.title}
                            </h3>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(mvp.status)}`}>
                                {mvp.status.replace('_', ' ')}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {mvp.download_count} downloads
                              </span>
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                  {mvp.average_rating.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link to={mvp.id ? `/mvp/${mvp.id}/edit` : '#'}>
                            <GlossyButton size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </GlossyButton>
                          </Link>
                          <Link to={mvp.id ? `/mvp/${mvp.id}` : '#'}>
                            <GlossyButton size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </GlossyButton>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      You haven't uploaded any MVPs yet
                    </p>
                    <Link to="/upload">
                      <GlossyButton>
                        <Plus className="w-4 h-4 mr-2" />
                        Upload Your First MVP
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
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link to="/upload" className="block w-full">
                    <GlossyButton className="w-full justify-start" variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New MVP
                    </GlossyButton>
                  </Link>
                  <Link to="/payouts" className="block w-full">
                    <GlossyButton className="w-full justify-start" variant="outline">
                      <DollarSign className="w-4 h-4 mr-2" />
                      View Payouts
                    </GlossyButton>
                  </Link>
                  <Link to="/analytics" className="block w-full">
                    <GlossyButton className="w-full justify-start" variant="outline">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Analytics
                    </GlossyButton>
                  </Link>
                </div>
              </GlassCard>
            </motion.div>

            {/* Stripe Connect Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Payout Settings
                </h3>
                {user.stripe_account_id ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Stripe account connected
                      </span>
                    </div>
                    <Link to="/payout-settings" className="block w-full">
                      <GlossyButton size="sm" variant="outline" className="w-full">
                        Manage Payouts
                      </GlossyButton>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Connect your Stripe account to receive payouts
                    </p>
                    <Link to="/connect-stripe" className="block w-full">
                      <GlossyButton size="sm" className="w-full">
                        Connect Stripe
                      </GlossyButton>
                    </Link>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
