// src/pages/AdminDashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCog,
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

  // State for the new User Management tab
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [sellerApprovalFilter, setSellerApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [userActionResult, setUserActionResult] = useState<{userId: string; success: boolean; message: string} | null>(null);

  // State for the Analytics tab
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsTimePeriod, setAnalyticsTimePeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // State for pending payouts
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
  const [processingPayouts, setProcessingPayouts] = useState<Set<string>>(new Set());
  const [payoutActionResult, setPayoutActionResult] = useState<{payoutId: string; success: boolean; message: string} | null>(null);

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
      
      // Load data based on active tab
      if (activeTab === 'users') {
        await loadUserManagementData();
      } else if (activeTab === 'analytics') {
        await loadAnalyticsData();
      } else {
        // Load overview data (existing functionality)
        await loadOverviewData();
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      // Fallback to initial empty stats
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

  // Function to load data for the Overview tab
  const loadOverviewData = async () => {
    try {
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
        pendingPayoutsResult,
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
        APIService.getPendingPayouts(),
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
      
      // Set pending payouts
      if (pendingPayoutsResult.status === 'fulfilled') {
        setPendingPayouts(pendingPayoutsResult.value);
      }
    } catch (error) {
      console.error('Error loading overview data:', error);
      throw error;
    }
  };

  // Function to load data for User Management tab
  const loadUserManagementData = async () => {
    try {
      const filters: {
        role?: string;
        sellerApproval?: boolean;
        search?: string;
      } = {};

      if (userFilter !== 'all') {
        filters.role = userFilter;
      }

      if (sellerApprovalFilter !== 'all') {
        filters.sellerApproval = sellerApprovalFilter === 'approved';
      }

      if (userSearchQuery) {
        filters.search = userSearchQuery;
      }

      const userData = await APIService.getAllProfilesForAdmin(filters);
      setAllUsers(userData);
    } catch (error) {
      console.error('Error loading user management data:', error);
      setAllUsers([]);
    }
  };

  // Function to load data for Analytics tab
  const loadAnalyticsData = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      const data = await APIService.getAdminAnalytics(analyticsTimePeriod);
      setAnalyticsData(data);
    } catch (error: any) {
      console.error('Error loading analytics data:', error);
      setAnalyticsError(error.message || 'Failed to load analytics data');
      setAnalyticsData(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    setUserActionLoading(userId);
    try {
      const result = await APIService.updateUserProfileByAdmin(userId, { role: newRole });
      
      if (result.success) {
        setUserActionResult({
          userId,
          success: true,
          message: `Role updated to ${newRole} successfully!`
        });
        
        // Update the user in our local state
        setAllUsers(prev => 
          prev.map(user => 
            user.id === userId ? { ...user, role: newRole as 'buyer' | 'seller' | 'admin' | 'both' } : user
          )
        );
      } else {
        setUserActionResult({
          userId,
          success: false,
          message: result.error || 'Failed to update role'
        });
      }
    } catch (error: any) {
      setUserActionResult({
        userId,
        success: false,
        message: error.message || 'An error occurred'
      });
    } finally {
      setUserActionLoading(null);
      setTimeout(() => setUserActionResult(null), 3000); // Clear message after 3 seconds
    }
  };

  const handleSellerApprovalToggle = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'reject' : 'approve';
    if (!confirm(`Are you sure you want to ${action} this seller?`)) {
      return;
    }

    setUserActionLoading(userId);
    try {
      const result = await APIService.updateUserProfileByAdmin(userId, {
        is_seller_approved: !currentStatus
      });
      
      if (result.success) {
        setUserActionResult({
          userId,
          success: true,
          message: `Seller ${action}d successfully!`
        });
        
        // Update the user in our local state
        setAllUsers(prev => 
          prev.map(user => 
            user.id === userId ? { ...user, is_seller_approved: !currentStatus } : user
          )
        );
      } else {
        setUserActionResult({
          userId,
          success: false,
          message: result.error || `Failed to ${action} seller`
        });
      }
    } catch (error: any) {
      setUserActionResult({
        userId,
        success: false,
        message: error.message || 'An error occurred'
      });
    } finally {
      setUserActionLoading(null);
      setTimeout(() => setUserActionResult(null), 3000); // Clear message after 3 seconds
    }
  };

  const handleProcessPayout = async (payoutId: string) => {
    if (!confirm('Are you sure you want to process this payout?')) {
      return;
    }

    // Add this payout to the processing set
    setProcessingPayouts(prev => new Set(prev).add(payoutId));
    
    try {
      const result = await APIService.processPayout(payoutId);
      
      if (result.success) {
        setPayoutActionResult({
          payoutId,
          success: true,
          message: result.message || 'Payout processing initiated successfully!'
        });
        
        // Update payout in list (may want to remove it or update status)
        setPendingPayouts(prev => 
          prev.filter(payout => payout.id !== payoutId)
        );
      } else {
        setPayoutActionResult({
          payoutId,
          success: false,
          message: result.message || 'Failed to process payout'
        });
      }
    } catch (error: any) {
      setPayoutActionResult({
        payoutId,
        success: false,
        message: error.message || 'An error occurred'
      });
    } finally {
      // Remove this payout from the processing set
      setProcessingPayouts(prev => {
        const updated = new Set(prev);
        updated.delete(payoutId);
        return updated;
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setPayoutActionResult(null), 3000);
    }
  };

  // Effect to load data when active tab changes
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'both')) {
      loadAdminData();
    }
  }, [activeTab, analyticsTimePeriod, user]);

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

  // Shared tabs configuration
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
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Pending Payouts
                    </h2> 
                    {pendingPayouts.length > 0 && (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                        {pendingPayouts.length} pending
                      </span>
                    )}
                  </div>
                  {loading || !pendingPayouts ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                      <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                    </div>
                  ) : pendingPayouts.length > 0 ? (
                    <div className="space-y-4">
                      {pendingPayouts.map(payout => (
                        <div 
                          key={payout.id} 
                          className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                        >
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {payout.profiles.display_name || payout.profiles.username || payout.profiles.email}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {payout.month_year} • ${Number(payout.commission_amount).toFixed(2)}
                            </p>
                          </div>
                          {payoutActionResult && payoutActionResult.payoutId === payout.id ? (
                            <div className={`text-sm ${payoutActionResult.success ? 'text-green-500' : 'text-red-500'}`}>
                              {payoutActionResult.message}
                            </div>
                          ) : (
                            <GlossyButton 
                              size="sm" 
                              onClick={() => handleProcessPayout(payout.id)}
                              disabled={processingPayouts.has(payout.id)}
                            >
                              {processingPayouts.has(payout.id) ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                  Processing...
                                </>
                              ) : (
                                'Process'
                              )}
                            </GlossyButton>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white/5 rounded-lg">
                      <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-300">No pending payouts at this time</p>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <UserCog className="w-6 h-6 text-blue-600 mr-2" />
                  User Management
                </h2>

                <div className="flex flex-col sm:flex-row gap-3 mt-3 sm:mt-0">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 w-full sm:w-64"
                    />
                  </div>

                  {/* Role Filter */}
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="buyer">Buyers</option>
                    <option value="seller">Sellers</option>
                    <option value="admin">Admins</option>
                    <option value="both">Both (Admin+Seller)</option>
                  </select>

                  {/* Seller Approval Filter (only shown when filtering for sellers) */}
                  {(userFilter === 'seller' || userFilter === 'both' || userFilter === 'all') && (
                    <select
                      value={sellerApprovalFilter}
                      onChange={(e) => setSellerApprovalFilter(e.target.value as any)}
                      className="px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Sellers</option>
                      <option value="approved">Approved Sellers</option>
                      <option value="pending">Pending Approval</option>
                    </select>
                  )}
                </div>
              </div>

              {/* User List */}
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                  ))}
                </div>
              ) : allUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Downloads
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {allUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 flex-shrink-0 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.email}
                                </p>
                                {user.username && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    @{user.username}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'admin'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : user.role === 'both'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                : user.role === 'seller'
                                ? (user.is_seller_approved
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300')
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {user.role === 'seller' && (
                                user.is_seller_approved
                                  ? '✓ Seller'
                                  : '⏳ Pending Seller'
                              )}
                              {user.role === 'buyer' && 'Buyer'}
                              {user.role === 'admin' && 'Admin'}
                              {user.role === 'both' && 'Admin + Seller'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {user.downloads_remaining}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            {/* Role Change Dropdown */}
                            <select
                              className="px-2 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-xs"
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              disabled={userActionLoading === user.id}
                            >
                              <option value="buyer">Buyer</option>
                              <option value="seller">Seller</option>
                              <option value="admin">Admin</option>
                              <option value="both">Both</option>
                            </select>
                            
                            {/* Approve/Reject Seller Button (only shown for sellers/both) */}
                            {(user.role === 'seller' || user.role === 'both') && (
                              <GlossyButton
                                size="sm"
                                variant="outline"
                                className={user.is_seller_approved ? "text-red-500" : "text-green-500"}
                                onClick={() => handleSellerApprovalToggle(user.id, user.is_seller_approved)}
                                disabled={userActionLoading === user.id}
                              >
                                {userActionLoading === user.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : user.is_seller_approved ? (
                                  'Reject Seller'
                                ) : (
                                  'Approve Seller'
                                )}
                              </GlossyButton>
                            )}
                            
                            {/* Action Result Message */}
                            {userActionResult && userActionResult.userId === user.id && (
                              <span className={`text-xs ${userActionResult.success ? 'text-green-500' : 'text-red-500'}`}>
                                {userActionResult.message}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-white/5 rounded-lg">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-300">No users found</p>
                  {userSearchQuery && (
                    <p className="text-sm text-gray-500 mt-1">
                      Try adjusting your search or filters
                    </p>
                  )}
                </div>
              )}
              
              {/* Pagination would go here */}
              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {allUsers.length} {allUsers.length === 1 ? 'user' : 'users'} found
                </p>
                
                {/* Buttons to load more or pagination controls would go here */}
              </div>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <PieChart className="w-6 h-6 text-blue-600 mr-2" />
                  Platform Analytics
                </h2>

                <div className="mt-3 sm:mt-0">
                  <select
                    value={analyticsTimePeriod}
                    onChange={(e) => setAnalyticsTimePeriod(e.target.value as any)}
                    className="px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="day">Last 24 Hours</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="year">Last 12 Months</option>
                  </select>
                </div>
              </div>

              {/* Analytics Content */}
              {analyticsLoading ? (
                <div className="animate-pulse space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-32 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                    ))}
                  </div>
                  <div className="h-72 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                </div>
              ) : analyticsError ? (
                <div className="text-center py-8 bg-white/5 rounded-lg">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-red-600 dark:text-red-400">{analyticsError}</p>
                  <GlossyButton 
                    variant="outline"
                    className="mt-4"
                    onClick={loadAnalyticsData}
                  >
                    Retry
                  </GlossyButton>
                </div>
              ) : analyticsData ? (
                <div className="space-y-8">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Total Users */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Total Users</p>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {analyticsData.counts.totalUsers.toLocaleString()}
                          </h3>
                        </div>
                        <Users className="w-6 h-6 text-blue-500" />
                      </div>
                    </div>
                    
                    {/* Total MVPs */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Published MVPs</p>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {analyticsData.counts.totalMVPs.toLocaleString()}
                          </h3>
                        </div>
                        <Package className="w-6 h-6 text-purple-500" />
                      </div>
                    </div>
                    
                    {/* Total Downloads */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Total Downloads</p>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {analyticsData.counts.totalDownloads.toLocaleString()}
                          </h3>
                        </div>
                        <Download className="w-6 h-6 text-green-500" />
                      </div>
                    </div>
                    
                    {/* Average Rating */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Average Rating</p>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {analyticsData.counts.averageRating.toFixed(1)} / 5
                          </h3>
                        </div>
                        <Star className="w-6 h-6 text-yellow-500" />
                      </div>
                    </div>
                    
                    {/* Total Revenue */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Total Revenue</p>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            ${analyticsData.counts.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h3>
                        </div>
                        <DollarSign className="w-6 h-6 text-green-500" />
                      </div>
                    </div>
                    
                    {/* Total Sellers */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Active Sellers</p>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {analyticsData.counts.totalSellers.toLocaleString()}
                          </h3>
                        </div>
                        <Users className="w-6 h-6 text-indigo-500" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Download Trends */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <Download className="w-5 h-5 text-green-500 mr-2" />
                        Download Trends
                      </h3>
                      <div className="h-64 flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400 text-center">
                          Charts require a charting library.<br />
                          Consider adding react-chartjs-2 or recharts for visualization.
                        </p>
                      </div>
                    </div>
                    
                    {/* User Growth */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <Users className="w-5 h-5 text-blue-500 mr-2" />
                        User Growth
                      </h3>
                      <div className="h-64 flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400 text-center">
                          Charts require a charting library.<br />
                          Consider adding react-chartjs-2 or recharts for visualization.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Trends and Insights */}
                  <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                      Platform Insights
                    </h3>
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="p-4 bg-white/5 rounded-lg flex-1">
                          <h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                            <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                            Most Downloaded Category
                          </h4>
                          <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">SaaS</p>
                        </div>
                        
                        <div className="p-4 bg-white/5 rounded-lg flex-1">
                          <h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 mr-2" />
                            Highest Rated Category
                          </h4>
                          <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">E-commerce</p>
                        </div>
                        
                        <div className="p-4 bg-white/5 rounded-lg flex-1">
                          <h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                            <Clock className="w-4 h-4 text-blue-500 mr-2" />
                            Average Time to Approval
                          </h4>
                          <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">2.3 days</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-white/5 rounded-lg">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-300">No analytics data available</p>
                  <GlossyButton 
                    className="mt-4"
                    onClick={loadAnalyticsData}
                  >
                    Load Analytics
                  </GlossyButton>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};