// src/components/ui/LaunchBlockerModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Rocket, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { GlossyButton } from './GlossyButton';
import { MarketingService } from '../../lib/api'; // Import MarketingService

interface LaunchBlockerModalProps {
  overrideQueryParam: string; // e.g., "override_launch_blocker"
}

// Define the fixed launch date (August 1st, 2025, 00:00:00 UTC)
const LAUNCH_DATE = new Date('2025-08-01T00:00:00Z');

export const LaunchBlockerModal: React.FC<LaunchBlockerModalProps> = ({
  overrideQueryParam,
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(0); // in milliseconds
  const [isOverridden, setIsOverridden] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // State for lead capture form
  const [email, setEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Define paths where the blocker should be automatically overridden
    const redirectPaths = [
      '/github-app-callback',
      '/buyer-github-callback',
      '/buyer-netlify-callback',
    ];

    // Check if the current path is one of the redirect paths
    const currentPath = window.location.pathname;
    const isRedirectPath = redirectPaths.some(path => currentPath.startsWith(path));

    // Check for override query parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get(overrideQueryParam) === 'true' || isRedirectPath) {
      setIsOverridden(true);
      return; // Do not show modal if overridden by query param or redirect path
    }

    const updateCountdown = () => {
      const now = new Date();
      const timeDiff = LAUNCH_DATE.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setRemainingTime(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        // Optionally, handle post-launch state (e.g., redirect to homepage, show "Launched!" message)
      } else {
        setRemainingTime(timeDiff);
      }
    };

    // Initial update
    updateCountdown();

    // Set up interval for continuous updates
    intervalRef.current = setInterval(updateCountdown, 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [overrideQueryParam]);

  if (isOverridden) {
    return null; // Don't render anything if overridden
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
    };
  };

  const time = formatTime(remainingTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    if (!agreedToTerms) {
      setMessage({ type: 'error', text: 'Please agree to the privacy policy' });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);

      const result = await MarketingService.processLeadCapture(email, agreedToTerms);

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setEmail('');
        setAgreedToTerms(false);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg"
      >
        <GlassCard className="p-8 text-center max-w-lg w-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mb-6"
          >
            <Rocket className="w-20 h-20 text-neon-green mx-auto mb-4 animate-float" />
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              Launch Imminent!
            </h1>
            <p className="text-lg text-gray-300">
              Our platform is almost ready. Get ready for the launch!
            </p>
          </motion.div>

          {remainingTime > 0 ? (
            <div className="flex justify-center items-center space-x-4 mb-8">
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-bold text-neon-cyan">
                  {time.days}
                </div>
                <div className="text-sm text-gray-400">DAYS</div>
              </div>
              <div className="text-5xl md:text-6xl font-bold text-gray-600">:</div>
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-bold text-neon-cyan">
                  {time.hours}
                </div>
                <div className="text-sm text-gray-400">HOURS</div>
              </div>
              <div className="text-5xl md:text-6xl font-bold text-gray-600">:</div>
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-bold text-neon-cyan">
                  {time.minutes}
                </div>
                <div className="text-sm text-gray-400">MINUTES</div>
              </div>
              <div className="text-5xl md:text-6xl font-bold text-gray-600">:</div>
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-bold text-neon-cyan">
                  {time.seconds}
                </div>
                <div className="text-sm text-gray-400">SECONDS</div>
              </div>
            </div>
          ) : (
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-neon-green">WE ARE LIVE!</h2>
              <p className="text-lg text-gray-300">The platform has officially launched!</p>
            </div>
          )}

          <div className="flex items-center justify-center text-gray-500 text-sm mb-8">
            <Clock className="w-4 h-4 mr-2" />
            <span>Countdown to a new era of Business Startup development.</span>
          </div>

          {/* Lead Capture Form */}
          <div className="mt-8 pt-8 border-t border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">
              Get Notified on Launch!
            </h2>
            <p className="text-gray-300 mb-6">
              Join our mailing list to receive updates, exclusive content, and launch announcements.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 dark:border-neon-green/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="privacy-terms"
                  checked={agreedToTerms}
                  onChange={() => setAgreedToTerms(!agreedToTerms)}
                  className="h-5 w-5 text-blue-600 dark:text-neon-green border-gray-300 dark:border-gray-600 rounded mt-1 focus:ring-blue-500 dark:focus:ring-neon-green"
                  disabled={isSubmitting}
                />
                <label htmlFor="privacy-terms" className="ml-3 text-sm text-gray-300">
                  I agree to the{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    className="text-blue-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    privacy policy
                  </a>{' '}
                  and consent to receive marketing communications.
                </label>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg ${
                    message.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
                  }`}
                >
                  <div className="flex items-center">
                    {message.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    )}
                    <span className="text-sm">{message.text}</span>
                  </div>
                </div>
              )}

              <GlossyButton
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                {isSubmitting ? 'Subscribing...' : 'Subscribe Now'}
              </GlossyButton>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                You can unsubscribe at any time. We never share your data.
              </p>
            </form>
          </div>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
};
