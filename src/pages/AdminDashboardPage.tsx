// src/pages/AdminDashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  DollarSign,
  TrendingUp,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Star,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import type { MVP, User } from '../types';
import { supabase } from '../lib/supabase';

interface AdminStats {
  totalUsers: number;
  totalSellers: number;
  totalMVPs: number;
  pendingMVPs: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalDownloads: number;
  averageRating: number;
}

interface PendingMVP extends MVP {
  submittedAt: string;
  sellerEmail: string;
}

export const AdminDashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'mvps' | 'users' | 'analytics'>('overview');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review' | 'approved' | 'rejected' | 'scan_failed' | 'ipfs_pin_failed'>('all');

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSellers: 0,
    totalMVPs: 0,
    pendingMVPs: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalDownloads: 0,
    averageRating: 0,
  });

  const [pendingMVPs, setPendingMVPs] = useState<PendingMVP[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if the user has admin or both roles
      if (user.role !== 'admin' && user.role !== 'both') {
        navigate('/dashboard');
        return;
      }

      loadAdminData();
    }
  }, [user, authLoading, navigate]);

  const loadAdminData = async () => {
    try {
      setLoading(true);

      // Fetch all necessary data concurrently
      const [
        totalUsersResult,
        totalSellersResult,
        approvedMVPsResult,
        pendingMVPsDataResult, // Renamed for clarity - this fetches the data
        pendingMVPsCountResult, // New query to fetch just the count
        totalDownloadsResult,
        allOrdersResult,
        recentUsersResult,
        allMVPsForRatingResult,
      ] = await Promise.allSettled([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('is_seller_approved', true).or('role.eq.seller,role.eq.both'),
        supabase.from('mvps').select('id', { count: 'exact' }).eq('status', 'approved'),
        // Query to fetch the actual data
        supabase.from('mvps').select(`*, profiles!mvps_seller_id_fkey(email)`)
          .in('status', ['pending_review', 'scan_failed', 'ipfs_pin_failed'])
          .order('created_at', { ascending: false }),
        // Separate query just to get the count
        supabase.from('mvps').select('id', { count: 'exact' })
          .in('status', ['pending_review', 'scan_failed', 'ipfs_pin_failed']),
        supabase.from('downloads').select('id', { count: 'exact' }),
        supabase.from('stripe_orders').select('amount_total, created_at').eq('status', 'completed'),
        supabase.from('profiles').select('id, email, role, is_seller_approved, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('mvps').select('average_rating').eq('status', 'approved'),
      ]);

      // Process results for stats
      const newStats: AdminStats = { ...stats };

      if (totalUsersResult.status === 'fulfilled' && totalUsersResult.value.count !== null) {
        newStats.totalUsers = totalUsersResult.value.count;
      }
      if (totalSellersResult.status === 'fulfilled' && totalSellersResult.value.count !== null) {
        newStats.totalSellers = totalSellersResult.value.count;
      }
      if (approvedMVPsResult.status === 'fulfilled' && approvedMVPsResult.value.count !== null) {
        newStats.totalMVPs = approvedMVPsResult.value.count;
      }
      
      // Handle the count result separately
      if (pendingMVPsCountResult.status === 'fulfilled' && pendingMVPsCountResult.value.count !== null) {
        newStats.pendingMVPs = pendingMVPsCountResult.value.count;
      }
      
      // Handle the data result separately
      if (pendingMVPsDataResult.status === 'fulfilled' && pendingMVPsDataResult.value.data) {
        const fetchedPendingMVPs = pendingMVPsDataResult.value.data?.map(mvp => ({
          ...mvp,
          submittedAt: mvp.created_at,
          sellerEmail: mvp.profiles?.email || 'Unknown',
        })) || [];
        
        setPendingMVPs(fetchedPendingMVPs);
      } else if (pendingMVPsDataResult.status === 'rejected') {
        console.error('pendingMVPsDataResult promise was rejected:', pendingMVPsDataResult.reason);
      }

      if (totalDownloadsResult.status === 'fulfilled' && totalDownloadsResult.value.count !== null) {
        newStats.totalDownloads = totalDownloadsResult.value.count;
      }

      if (allOrdersResult.status === 'fulfilled' && allOrdersResult.value.data) {
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

        let totalRevenue = 0;
        let monthlyRevenue = 0;

        allOrdersResult.value.data.forEach(order => {
          if (!order.amount_total) return;
          
          totalRevenue += order.amount_total; // amount_total is in cents
          if (new Date(order.created_at) >= oneMonthAgo) {
            monthlyRevenue += order.amount_total;
          }
        });
        
        newStats.totalRevenue = totalRevenue / 100; // Convert to dollars
        newStats.monthlyRevenue = monthlyRevenue / 100; // Convert to dollars
      }

      if (allMVPsForRatingResult.status === 'fulfilled' && allMVPsForRatingResult.value.data) {
        const ratings = allMVPsForRatingResult.value.data.map(mvp => mvp.average_rating).filter(rating => rating !== null);
        if (ratings.length > 0) {
          const sumRatings = ratings.reduce((sum, rating) => sum + rating, 0);
          newStats.averageRating = parseFloat((sumRatings / ratings.length).toFixed(1));
        } else {
          newStats.averageRating = 0;
        }
      }

      setStats(newStats);

      if (recentUsersResult.status === 'fulfilled' && recentUsersResult.value.data) {
        const fetchedRecentUsers = recentUsersResult.value.data.map(profile => ({
          ...profile,
          email: profile.email || `user-${profile.id.slice(0, 8)}@example.com`, // Fallback email
        }));
        setRecentUsers(fetchedRecentUsers);
      }

    } catch (error) {
      console.error('Error loading admin data:', error);
      // Fallback to initial empty stats if there's an error
      setStats({
        totalUsers: 0,
        totalSellers: 0,
        totalMVPs: 0,
        pendingMVPs: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalDownloads: 0,
        averageRating: 0,
      });
      setPendingMVPs([]);
      setRecentUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMVPAction = async (mvpId: string, action: 'approve' | 'reject') => {
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';

      const { error } = await supabase
        .from('mvps')
        .update({
          status: newStatus,
          published_at: action === 'approve' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);

      if (error) {
        console.error(`Error ${action}ing MVP:`, error);
        alert(`Failed to ${action} MVP: ${error.message}`);
        return;
      }

      // Update local state
      setPendingMVPs(prev => prev.filter(mvp => mvp.id !== mvpId));
      setStats(prev => ({
        ...prev,
        pendingMVPs: prev.pendingMVPs - 1,
        totalMVPs: action === 'approve' ? prev.totalMVPs + 1 : prev.totalMVPs,
      }));

      // Show success message
      alert(`MVP ${action}d successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing MVP:`, error);
      alert(`Failed to ${action} MVP`);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect handled in useEffect, but show access denied as fallback
  if (!user || (user.role !== 'admin' && user.role !== 'both')) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You don't have permission to access the admin dashboard.
          </p>
          <GlossyButton onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </GlossyButton>
        </GlassCard>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      change: '+12%',
    },
    {
      title: 'Active Sellers',
      value: stats.totalSellers.toLocaleString(),
      icon: Package,
      color: 'text-green-600',
      change: '+8%',
    },
    {
      title: 'Total MVPs',
      value: stats.totalMVPs.toLocaleString(),
      icon: Package,
      color: 'text-purple-600',
      change: '+15%',
    },
    {
      title: 'Pending Review',
      value: stats.pendingMVPs.toLocaleString(),
      icon: Clock,
      color: 'text-yellow-600',
      change: '-2',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-green-600',
      change: '+23%',
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-blue-600',
      change: '+18%',
    },
    {
      title: 'Total Downloads',
      value: stats.totalDownloads.toLocaleString(),
      icon: Download,
      color: 'text-indigo-600',
      change: '+31%',
    },
    {
      title: 'Avg Rating',
      value: stats.averageRating.toFixed(1),
      icon: Star,
      color: 'text-yellow-600',
      change: '+0.2',
    },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'mvps', label: 'MVP Reviews', icon: Package },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
  ];

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
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage users, review MVPs, and monitor platform performance
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <div className="flex space-x-1 bg-white/10 backdrop-blur-md rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {statCards.map((stat, index) => (
                <GlassCard key={stat.title} className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {stat.change} from last month
                      </p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </GlassCard>
              ))}
            </motion.div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pending MVPs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-yellow-600" />
                    Pending MVP Reviews
                  </h3>
                  {loading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                      <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                    </div>
                  ) : pendingMVPs.length > 0 ? (
                    <div className="space-y-4">
                      {pendingMVPs.slice(0, 3).map((mvp) => (
                        <div key={mvp.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">{mvp.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              by {mvp.sellerEmail}
                            </p>
                            <p className="text-xs text-gray-500">
                              Submitted {new Date(mvp.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <GlossyButton
                              size="sm"
                              variant="outline"
                              onClick={() => handleMVPAction(mvp.id, 'approve')}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </GlossyButton>
                            <GlossyButton
                              size="sm"
                              variant="outline"
                              onClick={() => handleMVPAction(mvp.id, 'reject')}
                            >
                              <XCircle className="w-4 h-4" />
                            </GlossyButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-300 text-center py-4">
                      No pending MVPs to review
                    </p>
                  )}
                </GlassCard>
              </motion.div>

              {/* Pending Payouts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Pending Payouts
                  </h3>
                  {loading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                      <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* This section would fetch actual pending payouts from your database */}
                      {/* For now, it remains mock data as per previous instructions */}
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">John Seller</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">April 2024 • $390.00</p>
                        </div>
                        <GlossyButton size="sm">
                          Process
                        </GlossyButton>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Sarah Dev</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">April 2024 • $222.50</p>
                        </div>
                        <GlossyButton size="sm">
                          Process
                        </GlossyButton>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>

              {/* Recent Users */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    Recent Users
                  </h3>
                  {loading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                      <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                    </div>
                  ) : recentUsers.length > 0 ? (
                    <div className="space-y-4">
                      {recentUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{user.email}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                              {user.role} • Joined {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'seller' && user.is_seller_approved
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : user.role === 'seller'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {user.role === 'seller' && user.is_seller_approved ? 'Approved Seller' :
                               user.role === 'seller' ? 'Pending Seller' : 'Buyer'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-300 text-center py-4">
                      No recent users found.
                    </p>
                  )}
                </GlassCard>
              </motion.div>
            </div>
          </div>
        )}

        {/* MVP Reviews Tab */}
        {activeTab === 'mvps' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  MVP Review Queue
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search MVPs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="scan_failed">Scan Failed</option> {/* Added filter option */}
                    <option value="ipfs_pin_failed">IPFS Failed</option> {/* Added filter option */}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                    <div className="h-32 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                  </div>
                ) : pendingMVPs.length > 0 ? (
                  pendingMVPs.filter(mvp =>
                    filterStatus === 'all' || mvp.status === filterStatus
                  ).filter(mvp =>
                    mvp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    mvp.sellerEmail.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((mvp) => (
                    <div key={mvp.id} className="border border-white/20 rounded-xl p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {mvp.title}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              mvp.status === 'pending_review'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : mvp.status === 'scan_failed'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                  : mvp.status === 'ipfs_pin_failed'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                            }`}>
                              {mvp.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>

                          <p className="text-gray-600 dark:text-gray-300 mb-3">{mvp.tagline}</p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Seller:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{mvp.sellerEmail}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Category:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{mvp.category}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Submitted:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {new Date(mvp.submittedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {mvp.tech_stack.slice(0, 5).map((tech) => (
                              <span
                                key={tech}
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <GlossyButton size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-2" />
                            Review
                          </GlossyButton>
                          <GlossyButton
                            size="sm"
                            onClick={() => handleMVPAction(mvp.id, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </GlossyButton>
                          <GlossyButton
                            size="sm"
                            variant="outline"
                            onClick={() => handleMVPAction(mvp.id, 'reject')}
                            className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </GlossyButton>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 dark:text-gray-300 text-center py-4">
                    No pending MVPs to review
                  </p>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                User Management
              </h2>
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                  <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                </div>
              ) : recentUsers.length > 0 ? (
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{user.email}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                          {user.role} • Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'seller' && user.is_seller_approved
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : user.role === 'seller'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {user.role === 'seller' && user.is_seller_approved ? 'Approved Seller' :
                           user.role === 'seller' ? 'Pending Seller' : 'Buyer'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">
                  No users found.
                </p>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Platform Analytics
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Advanced analytics and reporting features will be implemented here.
              </p>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};
