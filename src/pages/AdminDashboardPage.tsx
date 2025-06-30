// src/pages/AdminDashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield, User, Clock, CheckCircle, XCircle, Package, Users, AlertCircle, Loader2, Mail,
  DollarSign,
  TrendingUp,
  Eye,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Star,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  UserX,
  UserCheck,
  Edit,
  Loader2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Mail
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { NewsletterTypesManagement } from '../components/admin/NewsletterTypesManagement';
import { UserSubscriptionsManagement } from '../components/admin/UserSubscriptionsManagement';
import { NewsletterSubscribersManagement } from '../components/admin/NewsletterSubscribersManagement';
import { NewsletterTypesManagement, UserSubscriptionsManagement, NewsletterSubscribersManagement } from '../components/admin';
import { useAuth } from '../hooks/useAuth';
import { NotificationService } from '../lib/api';
import type { MVP, User } from '../types';
import { supabase } from '../lib/supabase';
import { APIService } from '../lib/api';

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

interface PendingPayout {
  id: string;
  seller_id: string;
  month_year: string;
  total_downloads: number;
  commission_amount: number;
  platform_fee_deducted: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  profiles: {
    id: string;
    email: string;
    username: string;
    display_name: string;
  };
}

export const AdminDashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'mvps' | 'users' | 'analytics' | 'newsletter'>('overview');
  const [activeNewsletterTab, setActiveNewsletterTab] = useState<'types' | 'subscribers' | 'userSubscriptions'>('types');
  
  // Sub-tab for newsletter management
  const [newsletterTab, setNewsletterTab] = useState<'types' | 'subscriptions' | 'subscribers'>('types');
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review' | 'approved' | 'rejected' | 'scan_failed' | 'ipfs_pin_failed'>('all');
  
  // User Management State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterRole, setUserFilterRole] = useState<'all' | 'buyer' | 'seller' | 'admin' | 'both'>('all');
  const [userFilterSellerApproval, setUserFilterSellerApproval] = useState<'all' | 'approved' | 'pending'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [userActionMessage, setUserActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // Payout Processing State
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);
  const [payoutMessage, setPayoutMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General State
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

      // Load data based on active tab
      if (activeTab === 'overview') {
        loadAdminData();
        loadPendingPayouts();
      } else if (activeTab === 'users') {
        loadUsers();
      } else if (activeTab === 'analytics') {
        loadAnalytics();
      }
    }
  }, [user, authLoading, navigate, activeTab]);

  // Effect to reload data when filters change in the MVP reviews tab
  useEffect(() => {
    if (activeTab === 'mvps' && !authLoading && (user?.role === 'admin' || user?.role === 'both')) {
      loadPendingMVPs();
    }
  }, [searchQuery, filterStatus, activeTab, user, authLoading]);

  // Effect to reload user data when user filters change
  useEffect(() => {
    if (activeTab === 'users' && !authLoading && (user?.role === 'admin' || user?.role === 'both')) {
      loadUsers();
    }
  }, [userSearchQuery, userFilterRole, userFilterSellerApproval, activeTab, user, authLoading]);

  // Load main admin dashboard data
  const loadAdminData = async () => {
    try {
      setLoading(true);

      // Fetch all necessary data concurrently
      const [
        { count: totalUsers },
        { count: totalSellers },
        { count: approvedMVPs },
        { data: pendingMVPsData },
        { count: pendingMVPsCount },
        { count: totalDownloads },
        { data: allOrdersData },
        { data: recentUsersData },
        { data: allMVPsForRatingData },
      ] = await Promise.allSettled([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
          .or('role.eq.seller,role.eq.both')
          .eq('is_seller_approved', true),
        supabase.from('mvps').select('id', { count: 'exact', head: true })
          .eq('status', 'approved'),
        // Query to fetch the actual data
        supabase.from('mvps').select(`*, profiles!mvps_seller_id_fkey(email)`)
          .in('status', ['pending_review', 'scan_failed', 'ipfs_pin_failed'])
          .order('created_at', { ascending: false }),
        // Separate query just to get the count
        supabase.from('mvps').select('id', { count: 'exact', head: true })
          .in('status', ['pending_review', 'scan_failed', 'ipfs_pin_failed']),
        supabase.from('downloads').select('id', { count: 'exact', head: true }),
        supabase.from('stripe_orders').select('amount_total, created_at').eq('status', 'completed'),
        supabase.from('profiles').select('id, email, username, display_name, role, is_seller_approved, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('mvps').select('average_rating').eq('status', 'approved'),
      ]);

      // Process results for stats
      const newStats: AdminStats = { ...stats };

      if (totalUsers.status === 'fulfilled' && totalUsers.value.count !== null) {
        newStats.totalUsers = totalUsers.value.count;
      }
      if (totalSellers.status === 'fulfilled' && totalSellers.value.count !== null) {
        newStats.totalSellers = totalSellers.value.count;
      }
      if (approvedMVPs.status === 'fulfilled' && approvedMVPs.value.count !== null) {
        newStats.totalMVPs = approvedMVPs.value.count;
      }
      
      // Handle the count result separately
      if (pendingMVPsCount.status === 'fulfilled' && pendingMVPsCount.value.count !== null) {
        newStats.pendingMVPs = pendingMVPsCount.value.count;
      }
      
      // Handle the data result separately
      if (pendingMVPsData.status === 'fulfilled' && pendingMVPsData.value.data) {
        const fetchedPendingMVPs = pendingMVPsData.value.data?.map(mvp => ({
          ...mvp,
          submittedAt: mvp.created_at,
          sellerEmail: mvp.profiles?.email || 'Unknown',
        })) || [];
        
        setPendingMVPs(fetchedPendingMVPs);
      } else if (pendingMVPsData.status === 'rejected') {
        console.error('pendingMVPsData promise was rejected:', pendingMVPsData.reason);
      }

      if (totalDownloads.status === 'fulfilled' && totalDownloads.value.count !== null) {
        newStats.totalDownloads = totalDownloads.value.count;
      }

      if (allOrdersData.status === 'fulfilled' && allOrdersData.value.data) {
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

        let totalRevenue = 0;
        let monthlyRevenue = 0;

        allOrdersData.value.data.forEach(order => {
          if (!order.amount_total) return;
          
          totalRevenue += order.amount_total; // amount_total is in cents
          if (new Date(order.created_at) >= oneMonthAgo) {
            monthlyRevenue += order.amount_total;
          }
        });
        
        newStats.totalRevenue = totalRevenue / 100; // Convert to dollars
        newStats.monthlyRevenue = monthlyRevenue / 100; // Convert to dollars
      }

      if (allMVPsForRatingData.status === 'fulfilled' && allMVPsForRatingData.value.data) {
        const ratings = allMVPsForRatingData.value.data.map(mvp => mvp.average_rating).filter(rating => rating !== null);
        if (ratings.length > 0) {
          const sumRatings = ratings.reduce((sum, rating) => sum + rating, 0);
          newStats.averageRating = parseFloat((sumRatings / ratings.length).toFixed(1));
        } else {
          newStats.averageRating = 0;
        }
      }

      setStats(newStats);

      if (recentUsersData.status === 'fulfilled' && recentUsersData.value.data) {
        const fetchedRecentUsers = recentUsersData.value.data.map(profile => ({
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

  // Load pending MVPs for the reviews tab
  const loadPendingMVPs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('mvps')
        .select(`*, profiles!mvps_seller_id_fkey(email, username, display_name)`)
        .order('created_at', { ascending: false });
      
      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,profiles.email.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching MVPs for review:', error);
        return;
      }
      
      const formattedMVPs = data?.map(mvp => ({
        ...mvp,
        submittedAt: mvp.created_at,
        sellerEmail: mvp.profiles?.email || 'Unknown',
        sellerUsername: mvp.profiles?.username || null,
        sellerDisplayName: mvp.profiles?.display_name || null,
      })) || [];
      
      setPendingMVPs(formattedMVPs);
    } catch (error) {
      console.error('Error loading pending MVPs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load users for the user management tab
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      setUserActionMessage(null);
      
      // Prepare filter options
      const filters: {
        role?: string;
        sellerApproval?: boolean;
        search?: string;
      } = {};
      
      if (userFilterRole !== 'all') {
        filters.role = userFilterRole;
      }
      
      if (userFilterSellerApproval !== 'all') {
        filters.sellerApproval = userFilterSellerApproval === 'approved';
      }
      
      if (userSearchQuery) {
        filters.search = userSearchQuery;
      }
      
      const fetchedUsers = await APIService.getAllProfilesForAdmin(filters);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setUserActionMessage({
        type: 'error',
        text: 'Failed to load users. Please try again.'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load analytics data for the analytics tab
  const loadAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      setAnalyticsError(null);
      
      const data = await APIService.getAdminAnalytics(analyticsPeriod);
      setAnalyticsData(data);
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      setAnalyticsError(error.message || 'Failed to load analytics data');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Load pending payouts for the overview tab
  const loadPendingPayouts = async () => {
    try {
      setLoadingPayouts(true);
      setPayoutMessage(null);
      
      const fetchedPayouts = await APIService.getPendingPayouts();
      setPendingPayouts(fetchedPayouts);
    } catch (error: any) {
      console.error('Error loading pending payouts:', error);
      setPayoutMessage({
        type: 'error',
        text: error.message || 'Failed to load pending payouts'
      });
    } finally {
      setLoadingPayouts(false);
    }
  };

  // Handle MVP approval/rejection
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

      // Send notification to the seller
      try {
        const mvpSellerId = mvp.seller_id || mvp.profiles?.id;
        if (mvpSellerId) {
          await NotificationService.createNotification({
            user_id: mvpSellerId,
            type: action === 'approve' ? 'mvp_approved' : 'mvp_rejected',
            message: `Your MVP "${mvp.title}" has been ${action}d by an administrator.`,
            link: `/mvp/${mvp.id}`
          });
        }
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the action if notification creation fails
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
      alert(`MVP ${action}ed successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing MVP:`, error);
      alert(`Failed to ${action} MVP`);
    }
  };

  // Handle user role update
  const handleUpdateUserRole = async (userId: string, newRole: 'buyer' | 'seller' | 'admin' | 'both') => {
    try {
      setUserActionLoading(userId);
      setUserActionMessage(null);
      
      const result = await APIService.updateUserProfileByAdmin(userId, { role: newRole });
      
      if (result.success) {
        // Update local state to reflect changes
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        setUserActionMessage({
          type: 'success',
          text: `User role updated to ${newRole} successfully`
        });
      } else {
        setUserActionMessage({
          type: 'error',
          text: result.error || 'Failed to update user role'
        });
      }
    } catch (error: any) {
      console.error('Error updating user role:', error);
      setUserActionMessage({
        type: 'error',
        text: error.message || 'An unexpected error occurred'
      });
    } finally {
      setUserActionLoading(null);
    }
  };

  // Handle seller approval
  const handleSellerApproval = async (userId: string, approve: boolean) => {
    try {
      setUserActionLoading(userId);
      setUserActionMessage(null);
      
      const result = await APIService.updateUserProfileByAdmin(userId, { is_seller_approved: approve });
      
      if (result.success) {
        // Update local state to reflect changes
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, is_seller_approved: approve } : user
        ));
        setUserActionMessage({
          type: 'success',
          text: `Seller ${approve ? 'approved' : 'rejected'} successfully`
        });
      } else {
        setUserActionMessage({
          type: 'error',
          text: result.error || 'Failed to update seller approval status'
        });
      }
    } catch (error: any) {
      console.error('Error updating seller approval:', error);
      setUserActionMessage({
        type: 'error',
        text: error.message || 'An unexpected error occurred'
      });
    } finally {
      setUserActionLoading(null);
    }
  };

  // Handle payout processing
  const handleProcessPayout = async (payoutId: string) => {
    try {
      setProcessingPayout(payoutId);
      setPayoutMessage(null);
      
      const result = await APIService.processPayout(payoutId);
      
      if (result.success) {
        // Remove processed payout from the list
        setPendingPayouts(prev => prev.filter(payout => payout.id !== payoutId));
        setPayoutMessage({
          type: 'success',
          text: result.message || 'Payout processed successfully'
        });
      } else {
        setPayoutMessage({
          type: 'error',
          text: result.message || 'Failed to process payout'
        });
      }
    } catch (error: any) {
      console.error('Error processing payout:', error);
      setPayoutMessage({
        type: 'error',
        text: error.message || 'An unexpected error occurred'
      });
    } finally {
      setProcessingPayout(null);
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
    { id: 'refunds', label: 'Refund Requests', icon: DollarSign },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'newsletter', label: 'Newsletter', icon: Mail },
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
          <div className="flex space-x-1 bg-white/10 backdrop-blur-md rounded-xl p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
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
                      {pendingMVPs.length > 3 && (
                        <div className="text-center mt-2">
                          <button 
                            className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                            onClick={() => setActiveTab('mvps')}
                          >
                            View all {pendingMVPs.length} pending MVPs
                          </button>
                        </div>
                      )}
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
                  {loadingPayouts ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                      <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                    </div>
                  ) : pendingPayouts.length > 0 ? (
                    <div className="space-y-3">
                      {pendingPayouts.slice(0, 3).map((payout) => (
                        <div key={payout.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {payout.profiles.display_name || payout.profiles.username || payout.profiles.email}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {payout.month_year} • ${payout.commission_amount.toFixed(2)}
                            </p>
                          </div>
                          <GlossyButton 
                            size="sm"
                            disabled={processingPayout === payout.id}
                            onClick={() => handleProcessPayout(payout.id)}
                          >
                            {processingPayout === payout.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Process"
                            )}
                          </GlossyButton>
                        </div>
                      ))}
                      {payoutMessage && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          payoutMessage.type === 'success' 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                        }`}>
                          {payoutMessage.text}
                        </div>
                      )}
                      {pendingPayouts.length > 3 && (
                        <div className="text-center mt-2">
                          <button 
                            className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                            onClick={() => alert("Payout Management page is under development")}
                          >
                            View all {pendingPayouts.length} pending payouts
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <DollarSign className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-600 dark:text-gray-300">
                        No pending payouts to process
                      </p>
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
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {user.display_name || user.username || user.email}
                            </h4>
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
                               user.role === 'seller' ? 'Pending Seller' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="text-center mt-2">
                        <button 
                          className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                          onClick={() => setActiveTab('users')}
                        >
                          Manage all users
                        </button>
                      </div>
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

        {/* Newsletter Management Tab */}
        {activeTab === 'newsletter' && (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <GlassCard className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Newsletter Management
                </h2>
                
                {/* Sub-tab navigation for newsletter management */}
                <div className="mb-6">
                  <div className="flex space-x-1 bg-white/10 dark:bg-gray-800/10 backdrop-blur-md rounded-xl p-1 overflow-x-auto">
                    <button
                      onClick={() => setActiveNewsletterTab('types')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeNewsletterTab === 'types'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      Newsletter Types
                    </button>
                    <button
                      onClick={() => setActiveNewsletterTab('subscribers')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeNewsletterTab === 'subscribers'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      Subscribers
                    </button>
                    <button
                      onClick={() => setActiveNewsletterTab('userSubscriptions')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeNewsletterTab === 'userSubscriptions'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      User Subscriptions
                    </button>
                  </div>
                </div>
                
                {/* Newsletter Types Management */}
                {activeNewsletterTab === 'types' && (
                  <NewsletterTypesManagement />
                )}
                
                {/* Newsletter Subscribers Management */}
                {activeNewsletterTab === 'subscribers' && (
                  <NewsletterSubscribersManagement />
                )}
                
                {/* User Subscriptions Management */}
                {activeNewsletterTab === 'userSubscriptions' && (
                  <UserSubscriptionsManagement />
                )}
              </GlassCard>
            </motion.div>
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
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 space-y-4 md:space-y-0">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  MVP Review Queue
                </h2>
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search MVPs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2 w-full sm:w-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="scan_failed">Scan Failed</option>
                    <option value="ipfs_pin_failed">IPFS Failed</option>
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
                  <div>
                    {pendingMVPs.map((mvp) => (
                      <div key={mvp.id} className="border border-white/20 rounded-xl p-6 mb-4">
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
                                <span className="ml-2 text-gray-900 dark:text-white">
                                  {mvp.sellerDisplayName || mvp.sellerUsername || mvp.sellerEmail}
                                </span>
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
                              {mvp.tech_stack.length > 5 && (
                                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
                                  +{mvp.tech_stack.length - 5} more
                                </span>
                              )}
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
                        
                        {/* Display error message for failed MVPs */}
                        {(mvp.status === 'scan_failed' || mvp.status === 'ipfs_pin_failed') && mvp.last_processing_error && (
                          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                            <p className="text-red-700 dark:text-red-300 font-semibold">Error:</p>
                            <p className="text-red-600 dark:text-red-400">{mvp.last_processing_error}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300 text-center py-4">
                    No MVPs matching your filters
                  </p>
                )}
                <button
                  onClick={() => setActiveTab('newsletter')}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'newsletter'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  <span>Newsletter</span>
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
        
        {/* Refund Requests Tab */}
        {activeTab === 'refunds' && (
          <RefundRequestsTab />
        )}
        
        {/* Disputes Tab */}
        {activeTab === 'disputes' && (
          <DisputesTab />
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
              
              {/* Filters */}
              <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users by email or username..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-green text-gray-900 dark:text-white"
                  />
                </div>
                
                <select
                  value={userFilterRole}
                  onChange={(e) => setUserFilterRole(e.target.value as any)}
                  className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-green text-gray-900 dark:text-white"
                >
                  <option value="all">All Roles</option>
                  <option value="buyer">Buyers</option>
                  <option value="seller">Sellers</option>
                  <option value="admin">Admins</option>
                  <option value="both">Both</option>
                </select>
                
                <select
                  value={userFilterSellerApproval}
                  onChange={(e) => setUserFilterSellerApproval(e.target.value as any)}
                  className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-green text-gray-900 dark:text-white"
                >
                  <option value="all">All Approval Status</option>
                  <option value="approved">Approved Sellers</option>
                  <option value="pending">Pending Sellers</option>
                </select>
              </div>
              
              {/* User Action Message */}
              {userActionMessage && (
                <div className={`mb-4 p-3 rounded-lg ${
                  userActionMessage.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}>
                  {userActionMessage.text}
                </div>
              )}

              {loadingUsers ? (
                <div className="animate-pulse space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                  ))}
                </div>
              ) : users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-white/20">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">User</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Role</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Joined</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Seller Status</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-white/5">
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              {user.profile_picture_url ? (
                                <img 
                                  src={user.profile_picture_url} 
                                  alt={user.username || user.email} 
                                  className="w-8 h-8 rounded-full mr-3 object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {user.display_name || user.username || 'Unnamed User'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4">
                            {user.role === 'seller' || user.role === 'both' ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.is_seller_approved
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                              }`}>
                                {user.is_seller_approved ? 'Approved' : 'Pending'}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex space-x-2">
                              {/* Change Role dropdown */}
                              <div className="relative group">
                                <GlossyButton
                                  size="sm"
                                  variant="outline"
                                  disabled={userActionLoading === user.id}
                                >
                                  {userActionLoading === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      Change Role
                                      <ChevronIcon className="w-4 h-4 ml-1" />
                                    </>
                                  )}
                                </GlossyButton>
                                
                                {/* Dropdown menu */}
                                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden z-10 hidden group-hover:block">
                                  <div className="py-1">
                                    {['buyer', 'seller', 'admin', 'both'].map((role) => (
                                      <button
                                        key={role}
                                        onClick={() => handleUpdateUserRole(user.id, role as any)}
                                        className={`w-full px-4 py-2 text-sm text-left ${
                                          user.role === role
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                        disabled={user.role === role}
                                      >
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Seller Approval/Rejection Buttons */}
                              {(user.role === 'seller' || user.role === 'both') && !user.is_seller_approved && (
                                <GlossyButton
                                  size="sm"
                                  variant="outline"
                                  className="bg-green-600 hover:bg-green-700 text-white border-transparent"
                                  onClick={() => handleSellerApproval(user.id, true)}
                                  disabled={userActionLoading === user.id}
                                >
                                  {userActionLoading === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4 mr-1" />
                                      Approve
                                    </>
                                  )}
                                </GlossyButton>
                              )}
                              
                              {(user.role === 'seller' || user.role === 'both') && user.is_seller_approved && (
                                <GlossyButton
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => handleSellerApproval(user.id, false)}
                                  disabled={userActionLoading === user.id}
                                >
                                  {userActionLoading === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <UserX className="w-4 h-4 mr-1" />
                                      Revoke
                                    </>
                                  )}
                                </GlossyButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">
                    No users found matching your filters.
                  </p>
                </div>
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
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 space-y-4 md:space-y-0">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-neon-green" />
                  Platform Analytics
                </h2>
                
                {/* Period selector */}
                <div className="flex space-x-1 bg-white/10 backdrop-blur-md rounded-lg p-1">
                  {['day', 'week', 'month', 'year'].map((period) => (
                    <button
                      key={period}
                      onClick={() => {
                        setAnalyticsPeriod(period as any);
                        loadAnalytics();
                      }}
                      className={`px-3 py-1 rounded text-sm ${
                        analyticsPeriod === period
                          ? 'bg-neon-green text-midnight-900 font-medium'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {loadingAnalytics ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-neon-green" />
                </div>
              ) : analyticsError ? (
                <div className="p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-500 dark:text-red-400 mb-4">{analyticsError}</p>
                  <GlossyButton onClick={loadAnalytics}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </GlossyButton>
                </div>
              ) : analyticsData ? (
                <>
                  {/* Key metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Revenue</p>
                      <p className="text-3xl font-bold text-neon-green">${analyticsData.counts.totalRevenue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Downloads</p>
                      <p className="text-3xl font-bold text-neon-green">{analyticsData.counts.totalDownloads.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">New Users (Last 30 days)</p>
                      <p className="text-3xl font-bold text-neon-green">
                        {Object.entries(analyticsData.trends.users || {})
                          .filter(([month]) => {
                            // Filter only entries from the last 30 days
                            const monthDate = new Date(month);
                            const thirtyDaysAgo = new Date();
                            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                            return monthDate >= thirtyDaysAgo;
                          })
                          .reduce((sum, [_, count]) => sum + (count as number), 0)
                          .toLocaleString()
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Download trends */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4">Download Trends</h3>
                    <div className="h-72 bg-white/5 rounded-xl border border-white/10 p-4">
                      {/* Here we would render a chart, but for now we'll display a placeholder */}
                      <div className="h-full flex items-center justify-center">
                        {Object.keys(analyticsData.trends.downloads || {}).length > 0 ? (
                          <div className="w-full">
                            <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
                              Chart visualization would be displayed here
                            </p>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead>
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Downloads</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trend</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                  {Object.entries(analyticsData.trends.downloads)
                                    .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
                                    .map(([month, count], index, array) => {
                                      // Calculate trend compared to previous month
                                      let trend = 0;
                                      if (index < array.length - 1) {
                                        const [_, prevCount] = array[index + 1];
                                        trend = (count as number) - (prevCount as number);
                                      }
                                      
                                      return (
                                        <tr key={month}>
                                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                            {new Date(month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                            {(count as number).toLocaleString()}
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            {trend !== 0 && (
                                              <span className={`flex items-center ${
                                                trend > 0 
                                                  ? 'text-green-600 dark:text-green-400' 
                                                  : 'text-red-600 dark:text-red-400'
                                              }`}>
                                                {trend > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                                {Math.abs(trend).toLocaleString()}
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400">No download data available</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* User growth */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
                    <div className="h-72 bg-white/5 rounded-xl border border-white/10 p-4">
                      {/* Here we would render a chart, but for now we'll display a placeholder */}
                      <div className="h-full flex items-center justify-center">
                        {Object.keys(analyticsData.trends.users || {}).length > 0 ? (
                          <div className="w-full">
                            <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
                              Chart visualization would be displayed here
                            </p>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead>
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">New Users</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Growth</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                  {Object.entries(analyticsData.trends.users)
                                    .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
                                    .map(([month, count], index, array) => {
                                      // Calculate growth compared to previous month
                                      let growth = 0;
                                      let percentage = 0;
                                      if (index < array.length - 1) {
                                        const [_, prevCount] = array[index + 1];
                                        growth = (count as number) - (prevCount as number);
                                        percentage = prevCount > 0 ? (growth / (prevCount as number)) * 100 : 0;
                                      }
                                      
                                      return (
                                        <tr key={month}>
                                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                            {new Date(month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                            {(count as number).toLocaleString()}
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            {growth !== 0 && (
                                              <span className={`flex items-center ${
                                                growth > 0 
                                                  ? 'text-green-600 dark:text-green-400' 
                                                  : 'text-red-600 dark:text-red-400'
                                              }`}>
                                                {growth > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                                {Math.abs(growth).toLocaleString()} 
                                                {percentage !== 0 && (
                                                  <span className="ml-1">
                                                    ({percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%)
                                                  </span>
                                                )}
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400">No user growth data available</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 mb-4">No analytics data available</p>
                  <GlossyButton onClick={loadAnalytics}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Load Analytics
                  </GlossyButton>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* Newsletter Management Tab */}
        {activeTab === 'newsletter' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Newsletter Management
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Manage newsletter types, user subscriptions, and general subscribers.
              </p>
            </div>
            
            {/* Newsletter Sub-Tabs */}
            <div className="mb-8">
              <div className="flex space-x-1 bg-white/10 backdrop-blur-md rounded-xl p-1 max-w-xl">
                {[
                  { id: 'types', label: 'Newsletter Types', icon: Mail },
                  { id: 'subscriptions', label: 'User Subscriptions', icon: Users },
                  { id: 'subscribers', label: 'General Subscribers', icon: BarChart3 }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setNewsletterTab(tab.id as 'types' | 'subscriptions' | 'subscribers')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 ${
                      newsletterTab === tab.id
                        ? 'bg-neon-green text-midnight-900'
                        : 'text-gray-700 dark:text-gray-300 hover:text-neon-green dark:hover:text-neon-green'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Newsletter Type Management */}
            {newsletterTab === 'types' && (
              <NewsletterTypesManagement />
            )}
            
            {/* User Subscriptions Management */}
            {newsletterTab === 'subscriptions' && (
              <UserSubscriptionsManagement />
            )}
            
            {/* General Subscribers Management */}
            {newsletterTab === 'subscribers' && (
              <NewsletterSubscribersManagement />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Refund Requests Tab Component
const RefundRequestsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'processed'>('pending');
  
  useEffect(() => {
    loadRefundRequests();
  }, [filter]);
  
  const loadRefundRequests = async () => {
    try {
      setLoading(true);
      const requests = await RefundService.getRefundRequests(filter === 'all' ? undefined : filter);
      setRefundRequests(requests);
    } catch (error) {
      console.error('Error loading refund requests:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      setProcessingRequest(requestId);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const result = await RefundService.updateRefundRequestStatus(
        requestId,
        status,
        user.id
      );
      
      if (result.success) {
        // Refresh the list
        loadRefundRequests();
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      console.error('Error updating refund status:', error);
      alert(error.message || 'Failed to update refund status');
    } finally {
      setProcessingRequest(null);
    }
  };
  
  const handleProcessRefund = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const result = await RefundService.processRefund(requestId, user.id);
      
      if (result.success) {
        alert(`Refund processed successfully. Refund ID: ${result.refundId}`);
        // Refresh the list
        loadRefundRequests();
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      console.error('Error processing refund:', error);
      alert(error.message || 'Failed to process refund');
    } finally {
      setProcessingRequest(null);
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
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Refund Request Management
          </h2>
          <div className="flex space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-sm"
            >
              <option value="all">All Requests</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="processed">Processed</option>
            </select>
            <GlossyButton
              size="sm"
              variant="outline"
              onClick={loadRefundRequests}
            >
              Refresh
            </GlossyButton>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading refund requests...</p>
          </div>
        ) : refundRequests.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No refund requests found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'pending' 
                ? "There are no pending refund requests at the moment." 
                : `No refund requests with '${filter}' status.`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {refundRequests.map((request) => (
              <div 
                key={request.id} 
                className="border border-white/10 rounded-xl p-6 hover:bg-white/5 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                  <div className="flex items-start mb-4 lg:mb-0">
                    <div className="bg-midnight-700 p-2 rounded-lg mr-3">
                      <DollarSign className="w-6 h-6 text-neon-green" />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold text-white mr-3">
                          ${request.amount_requested.toFixed(2)} Refund Request
                        </h3>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(request.status)}`}>
                          <span className="font-medium capitalize">{request.status}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        From: {request.user?.username || request.user?.email || 'Unknown User'}
                        {' · '}
                        Subscription: {request.subscription?.plan_type} Plan
                        {' · '}
                        Submitted: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {request.status === 'pending' && (
                      <>
                        <GlossyButton
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={!!processingRequest}
                          onClick={() => handleUpdateStatus(request.id, 'approved')}
                        >
                          {processingRequest === request.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          <span>Approve</span>
                        </GlossyButton>
                        
                        <GlossyButton
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          disabled={!!processingRequest}
                          onClick={() => handleUpdateStatus(request.id, 'rejected')}
                        >
                          {processingRequest === request.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 mr-1" />
                          )}
                          <span>Reject</span>
                        </GlossyButton>
                      </>
                    )}
                    
                    {request.status === 'approved' && (
                      <GlossyButton
                        size="sm"
                        disabled={!!processingRequest}
                        onClick={() => handleProcessRefund(request.id)}
                      >
                        {processingRequest === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <DollarSign className="w-4 h-4 mr-1" />
                        )}
                        <span>Process Refund</span>
                      </GlossyButton>
                    )}
                  </div>
                </div>
                
                <div className="p-4 bg-white/5 dark:bg-midnight-800/20 rounded-lg">
                  <h4 className="text-sm font-medium text-white mb-2">Reason:</h4>
                  <p className="text-gray-300">{request.reason}</p>
                </div>
                
                {request.processed_at && (
                  <div className="mt-4 text-sm text-gray-400">
                    <span className="font-medium text-neon-cyan">Processed:</span> {new Date(request.processed_at).toLocaleString()}
                    {request.stripe_refund_id && (
                      <span className="ml-3">
                        <span className="font-medium text-neon-cyan">Refund ID:</span> {request.stripe_refund_id}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

// Disputes Tab Component
const DisputesTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [processingDispute, setProcessingDispute] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_review' | 'resolved_buyer' | 'resolved_seller' | 'closed_no_action'>('open');
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionAction, setResolutionAction] = useState<'resolved_buyer' | 'resolved_seller' | 'closed_no_action' | null>(null);
  
  useEffect(() => {
    loadDisputes();
  }, [filter]);
  
  const loadDisputes = async () => {
    try {
      setLoading(true);
      const loadedDisputes = await DisputeService.getDisputes(filter === 'all' ? undefined : filter);
      setDisputes(loadedDisputes);
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const openResolutionModal = (disputeId: string, action: 'resolved_buyer' | 'resolved_seller' | 'closed_no_action') => {
    setSelectedDisputeId(disputeId);
    setResolutionAction(action);
    setResolutionDetails('');
    setShowResolutionModal(true);
  };
  
  const closeResolutionModal = () => {
    setShowResolutionModal(false);
    setSelectedDisputeId(null);
    setResolutionAction(null);
    setResolutionDetails('');
  };
  
  const submitResolution = async () => {
    if (!selectedDisputeId || !resolutionAction) return;
    
    try {
      setProcessingDispute(selectedDisputeId);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const result = await DisputeService.updateDisputeStatus(
        selectedDisputeId,
        resolutionAction,
        user.id,
        resolutionDetails
      );
      
      if (result.success) {
        closeResolutionModal();
        loadDisputes();
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      console.error('Error updating dispute:', error);
      alert(error.message || 'Failed to update dispute');
    } finally {
      setProcessingDispute(null);
    }
  };
  
  const handleInReview = async (disputeId: string) => {
    try {
      setProcessingDispute(disputeId);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const result = await DisputeService.updateDisputeStatus(
        disputeId,
        'in_review',
        user.id
      );
      
      if (result.success) {
        // Refresh the list
        loadDisputes();
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      console.error('Error updating dispute status:', error);
      alert(error.message || 'Failed to update dispute status');
    } finally {
      setProcessingDispute(null);
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
        return 'Open';
      case 'in_review':
        return 'In Review';
      case 'resolved_buyer':
        return 'Resolved (Buyer)';
      case 'resolved_seller':
        return 'Resolved (Seller)';
      case 'closed_no_action':
        return 'Closed';
      default:
        return status.replace(/_/g, ' ');
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Dispute Management
          </h2>
          <div className="flex space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-sm"
            >
              <option value="all">All Disputes</option>
              <option value="open">Open</option>
              <option value="in_review">In Review</option>
              <option value="resolved_buyer">Resolved (Buyer)</option>
              <option value="resolved_seller">Resolved (Seller)</option>
              <option value="closed_no_action">Closed</option>
            </select>
            <GlossyButton
              size="sm"
              variant="outline"
              onClick={loadDisputes}
            >
              Refresh
            </GlossyButton>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading disputes...</p>
          </div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No disputes found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'open' 
                ? "There are no open disputes at the moment." 
                : `No disputes with '${filter.replace(/_/g, ' ')}' status.`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {disputes.map((dispute) => (
              <div 
                key={dispute.id} 
                className="border border-white/10 rounded-xl p-6 hover:bg-white/5 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                  <div className="flex items-start mb-4 lg:mb-0">
                    <div className="bg-midnight-700 p-2 rounded-lg mr-3 mt-1">
                      <AlertTriangle className="w-6 h-6 text-neon-green" />
                    </div>
                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <h3 className="text-lg font-semibold text-white mr-2">
                          Dispute: {dispute.mvp?.title || 'Unknown MVP'}
                        </h3>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(dispute.status)}`}>
                          <span className="font-medium">{getStatusText(dispute.status)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Buyer: {dispute.buyer?.username || dispute.buyer?.email || 'Unknown'}
                        {' · '}
                        Seller: {dispute.seller?.username || dispute.seller?.email || 'Unknown'}
                        {' · '}
                        Opened: {new Date(dispute.opened_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Link to={`/disputes/${dispute.id}`}>
                      <GlossyButton size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        <span>View</span>
                      </GlossyButton>
                    </Link>
                    
                    {dispute.status === 'open' && (
                      <GlossyButton
                        size="sm"
                        disabled={!!processingDispute}
                        onClick={() => handleInReview(dispute.id)}
                      >
                        {processingDispute === dispute.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4 mr-1" />
                        )}
                        <span>Start Review</span>
                      </GlossyButton>
                    )}
                    
                    {dispute.status === 'in_review' && (
                      <div className="flex space-x-2">
                        <GlossyButton
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={!!processingDispute}
                          onClick={() => openResolutionModal(dispute.id, 'resolved_buyer')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span>Buyer</span>
                        </GlossyButton>
                        
                        <GlossyButton
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          disabled={!!processingDispute}
                          onClick={() => openResolutionModal(dispute.id, 'resolved_seller')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span>Seller</span>
                        </GlossyButton>
                        
                        <GlossyButton
                          size="sm"
                          className="bg-gray-600 hover:bg-gray-700"
                          disabled={!!processingDispute}
                          onClick={() => openResolutionModal(dispute.id, 'closed_no_action')}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          <span>Close</span>
                        </GlossyButton>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4 bg-white/5 dark:bg-midnight-800/20 rounded-lg">
                  <h4 className="text-sm font-medium text-white mb-2">Reason: {dispute.reason}</h4>
                  <p className="text-gray-300 line-clamp-3">{dispute.details}</p>
                </div>
                
                {dispute.resolution_details && (
                  <div className="mt-4 p-4 bg-white/5 dark:bg-midnight-800/20 rounded-lg border-l-2 border-neon-green">
                    <h4 className="text-sm font-medium text-white mb-2">Resolution:</h4>
                    <p className="text-gray-300">{dispute.resolution_details}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
      
      {/* Resolution Modal */}
      {showResolutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-midnight-800 rounded-lg shadow-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Resolve Dispute
              {resolutionAction === 'resolved_buyer' && ' (in favor of buyer)'}
              {resolutionAction === 'resolved_seller' && ' (in favor of seller)'}
              {resolutionAction === 'closed_no_action' && ' (no action)'}
            </h3>
            
            <p className="text-gray-300 mb-4">
              Please provide details about the resolution decision:
            </p>
            
            <textarea
              value={resolutionDetails}
              onChange={(e) => setResolutionDetails(e.target.value)}
              rows={5}
              className="w-full p-3 bg-midnight-900 border border-white/20 rounded-lg text-white mb-6"
              placeholder="Enter resolution details here..."
            />
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeResolutionModal}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitResolution}
                disabled={!resolutionDetails.trim() || !!processingDispute}
                className="px-4 py-2 bg-neon-green text-midnight-900 rounded-lg hover:bg-neon-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {processingDispute ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Chevron Icon Component
const ChevronIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);