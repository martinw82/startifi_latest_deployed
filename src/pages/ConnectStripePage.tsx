import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Shield, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  Building,
  Globe,
  Lock
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { APIService } from '../lib/api';

export const ConnectStripePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and is an approved seller
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!user.is_seller_approved) {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  const handleConnectStripe = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const result = await APIService.createStripeConnectAccountLink(user.id);
      
      if (result.success && result.accountLinkUrl) {
        // Redirect to Stripe's hosted onboarding flow
        window.location.href = result.accountLinkUrl;
      } else {
        setError(result.message || 'Failed to create Stripe Connect account link');
      }
    } catch (err: any) {
      console.error('Error connecting to Stripe:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

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
            You need to be an approved seller to connect a Stripe account.
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Connect Your Stripe Account
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Set up secure payments and start receiving payouts for your MVP sales. 
            Stripe Connect ensures safe and reliable transactions.
          </p>
        </motion.div>

        {/* Already Connected Check */}
        {user.stripe_account_id ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <GlassCard className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Stripe Account Connected!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Your Stripe account is already connected and ready to receive payouts.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <GlossyButton onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </GlossyButton>
                <GlossyButton 
                  variant="outline"
                  onClick={() => navigate('/payouts')}
                >
                  View Payouts
                </GlossyButton>
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          <>
            {/* Benefits Section */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              {[
                {
                  icon: DollarSign,
                  title: 'Secure Payouts',
                  description: 'Receive payments directly to your bank account with industry-leading security.'
                },
                {
                  icon: Shield,
                  title: 'Protected Transactions',
                  description: 'Stripe handles all payment processing and fraud protection automatically.'
                },
                {
                  icon: Globe,
                  title: 'Global Reach',
                  description: 'Accept payments from customers worldwide in multiple currencies.'
                }
              ].map((benefit, index) => (
                <GlassCard key={benefit.title} className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {benefit.description}
                  </p>
                </GlassCard>
              ))}
            </motion.div>

            {/* Main Connect Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <GlassCard className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Set Up Your Stripe Account
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Click the button below to securely connect your Stripe account. 
                    You'll be redirected to Stripe's secure platform to complete the setup.
                  </p>
                </div>

                {/* Process Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {[
                    {
                      step: 1,
                      title: 'Account Setup',
                      description: 'Provide your business information and bank details'
                    },
                    {
                      step: 2,
                      title: 'Verification',
                      description: 'Stripe will verify your identity and business'
                    },
                    {
                      step: 3,
                      title: 'Start Earning',
                      description: 'Begin receiving payouts from your MVP sales'
                    }
                  ].map((step) => (
                    <div key={step.step} className="text-center">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                        {step.step}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <p className="text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                )}

                {/* Connect Button */}
                <div className="text-center">
                  <GlossyButton
                    onClick={handleConnectStripe}
                    disabled={loading}
                    className="flex items-center space-x-3 mx-auto text-lg px-8 py-4"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Setting up your account...</span>
                      </>
                    ) : (
                      <>
                        <Building className="w-6 h-6" />
                        <span>Connect with Stripe</span>
                        <ArrowRight className="w-6 h-6" />
                      </>
                    )}
                  </GlossyButton>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 flex items-center justify-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Secured by Stripe • Your data is encrypted and protected</span>
                  </p>
                </div>

                {/* Security Notice */}
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Your Security is Our Priority
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        We never store your banking information. All financial data is securely 
                        handled by Stripe, a PCI DSS Level 1 certified payment processor trusted 
                        by millions of businesses worldwide.
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};