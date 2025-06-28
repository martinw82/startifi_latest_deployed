import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download, 
  AlertCircle, 
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  ArrowUpRight,
  Filter,
  Search
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { APIService } from '../lib/api';

interface PayoutData {
  id: string;
  month_year: string;
  total_downloads: number;
  commission_amount: number;
  platform_fee_deducted: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  processed_at?: string;
}

interface EarningsStats {
  totalEarnings: number;
  pendingPayouts: number;
  thisMonthEarnings: number;
  totalDownloads: number;
}

export const PayoutsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    pendingPayouts: 0,
    thisMonthEarnings: 0,
    totalDownloads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!user.is_seller_approved) {
      navigate('/dashboard');
      return;
    }

    loadPayoutData();
  }, [user, navigate]);

  const loadPayoutData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Mock payout data - in real app, this would come from API
      const mockPayouts: PayoutData[] = [
        {
          id: '1',
          month_year: '2024-01',
          total_downloads: 47,
          commission_amount: 117.50,
          platform_fee_deducted: 35.25,
          status: 'completed',
          created_at: '2024-01-31T23:59:59Z',
          processed_at: '2024-02-01T12:00:00Z',
        },
        {
          id: '2',
          month_year: '2024-02',
          total_downloads: 63,
          commission_amount: 157.50,
          platform_fee_deducted: 47.25,
          status: 'completed',
          created_at: '2024-02-29T23:59:59Z',
          processed_at: '2024-03-01T10:30:00Z',
        },
        {
          id: '3',
          month_year: '2024-03',
          total_downloads: 89,
          commission_amount: 222.50,
          platform_fee_deducted: 66.75,
          status: 'processing',
          created_at: '2024-03-31T23:59:59Z',
        },
        {
          id: '4',
          month_year: '2024-04',
          total_downloads: 156,
          commission_amount: 390.00,
          platform_fee_deducted: 117.00,
          status: 'pending',
          created_at: '2024-04-30T23:59:59Z',
        },
      ];

      // For beta user, use mock data
      if (user.id === 'beta-user-123') {
        setPayouts(mockPayouts);
        
        const totalEarnings = mockPayouts
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.commission_amount, 0);
        
        const pendingPayouts = mockPayouts
          .filter(p => p.status === 'pending' || p.status === 'processing')
          .reduce((sum, p) => sum + p.commission_amount, 0);
        
        const totalDownloads = mockPayouts.reduce((sum, p) => sum + p.total_downloads, 0);
        
        setStats({
          totalEarnings,
          pendingPayouts,
          thisMonthEarnings: mockPayouts[mockPayouts.length - 1]?.commission_amount || 0,
          totalDownloads,
        });
      } else {
        // In real app, fetch actual payout data from API
        const payoutData = await APIService.getSellerPayouts(user.id);
        setPayouts(payoutData || []);
        
        // Calculate stats from real data
        const totalEarnings = payoutData
          ?.filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.commission_amount, 0) || 0;
        
        setStats({
          totalEarnings,
          pendingPayouts: 0,
          thisMonthEarnings: 0,
          totalDownloads: 0,
        });
      }
    } catch (error) {
      console.error('Error loading payout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const filteredPayouts = payouts.filter(payout => 
    filter === 'all' || payout.status === filter
  );

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user.is_seller_approved) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Seller Approval Required
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You need to be an approved seller to view payouts.
          </p>
          <GlossyButton onClick={() => navigate('/dashboard')}>
            Back to Dashboard
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
              Payouts & Earnings
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Track your earnings and payout history
            </p>
          </div>
          {!user.stripe_account_id && (
            <GlossyButton 
              onClick={() => navigate('/connect-stripe')}
              className="flex items-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Connect Stripe</span>
            </GlossyButton>
          )}
        </motion.div>

        {/* Stripe Connection Warning */}
        {!user.stripe_account_id && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <GlassCard className="p-6 border-l-4 border-yellow-500">
              <div className="flex items-start space-x-4">
                <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Connect Your Stripe Account
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    To receive payouts, you need to connect your Stripe account. This allows us to securely transfer your earnings directly to your bank account.
                  </p>
                  <GlossyButton 
                    onClick={() => navigate('/connect-stripe')}
                    className="flex items-center space-x-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Connect Stripe Account</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </GlossyButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          {[
            {
              title: 'Total Earnings',
              value: `$${stats.totalEarnings.toFixed(2)}`,
              icon: DollarSign,
              color: 'text-green-600',
              change: '+$47.50 this month',
            },
            {
              title: 'Pending Payouts',
              value: `$${stats.pendingPayouts.toFixed(2)}`,
              icon: Clock,
              color: 'text-yellow-600',
              change: 'Processing payouts',
            },
            {
              title: 'This Month',
              value: `$${stats.thisMonthEarnings.toFixed(2)}`,
              icon: TrendingUp,
              color: 'text-blue-600',
              change: '+23% from last month',
            },
            {
              title: 'Total Downloads',
              value: stats.totalDownloads.toString(),
              icon: Download,
              color: 'text-purple-600',
              change: 'All-time downloads',
            },
          ].map((stat, index) => (
            <GlassCard key={stat.title} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {stat.change}
                  </p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </GlassCard>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <GlassCard className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by status:
              </span>
              {[
                { key: 'all', label: 'All Payouts' },
                { key: 'pending', label: 'Pending' },
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

        {/* Payouts List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Payout History
            </h2>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="w-24 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                          <div className="w-32 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        </div>
                      </div>
                      <div className="w-20 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPayouts.length > 0 ? (
              <div className="space-y-4">
                {filteredPayouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {new Date(payout.month_year + '-01').toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                          })} Payout
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                          <span>{payout.total_downloads} downloads</span>
                          <span>•</span>
                          <span>Created {new Date(payout.created_at).toLocaleDateString()}</span>
                          {payout.processed_at && (
                            <>
                              <span>•</span>
                              <span>Processed {new Date(payout.processed_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${payout.commission_amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          -${payout.platform_fee_deducted.toFixed(2)} fee
                        </p>
                      </div>
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payout.status)}`}>
                        {getStatusIcon(payout.status)}
                        <span className="capitalize">{payout.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Payouts Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Start selling MVPs to earn your first payout. Payouts are processed monthly.
                </p>
                <GlossyButton onClick={() => navigate('/upload')}>
                  Upload Your First MVP
                </GlossyButton>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Payout Information */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              How Payouts Work
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <Calendar className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Monthly Payouts</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Payouts are processed on the 1st of each month for the previous month's sales.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <DollarSign className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">70% Commission</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    You keep 70% of each sale. Platform fee is 30% to cover hosting and support.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CreditCard className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Direct Deposit</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Payments are sent directly to your connected bank account via Stripe.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};