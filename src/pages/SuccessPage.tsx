import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Download, CreditCard } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';

export const SuccessPage: React.FC = () => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Get session_id from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session_id');
    setSessionId(sessionIdParam);
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-green-900 dark:to-blue-900" />
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <GlassCard className="p-12 max-w-2xl mx-auto">
            {/* Success Icon */}
            <motion.div
              className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>

            {/* Success Message */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Payment Successful!
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Thank you for subscribing to MVP Library. Your subscription is now active and you can start downloading premium MVP templates.
            </p>

            {/* Session Info */}
            {sessionId && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-8">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Transaction ID: <span className="font-mono text-gray-900 dark:text-white">{sessionId}</span>
                </p>
              </div>
            )}

            {/* Next Steps */}
            <div className="space-y-6 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                What's Next?
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <Download className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Start Downloading</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Browse our library and download your first MVP template
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <CreditCard className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Manage Subscription</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      View your subscription details in your dashboard
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <GlossyButton
                onClick={() => window.location.href = '/mvps'}
                className="flex items-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Browse MVPs</span>
                <ArrowRight className="w-5 h-5" />
              </GlossyButton>
              
              <GlossyButton
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
              >
                Go to Dashboard
              </GlossyButton>
            </div>

            {/* Support */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Need help getting started?{' '}
                <a href="/support" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Contact our support team
                </a>
              </p>
            </div>
          </GlassCard>
        </motion.div>

        {/* Additional Information */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Instant Access
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Your subscription is active immediately. Start downloading MVPs right away.
              </p>
            </GlassCard>
            
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Email Confirmation
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Check your email for a receipt and subscription details.
              </p>
            </GlassCard>
            
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Cancel Anytime
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                You can cancel your subscription at any time from your dashboard.
              </p>
            </GlassCard>
          </div>
        </motion.div>
      </div>
    </div>
  );
};