// src/components/ui/LaunchBlockerModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Rocket } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { GlossyButton } from './GlossyButton';

interface LaunchBlockerModalProps {
  launchDurationHours: number;
  overrideQueryParam: string; // e.g., "override_launch_blocker"
}

export const LaunchBlockerModal: React.FC<LaunchBlockerModalProps> = ({
  launchDurationHours,
  overrideQueryParam,
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(0); // in milliseconds
  const [isOverridden, setIsOverridden] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

    let launchCountdownStartTime: number;
    const storedStartTime = localStorage.getItem('launch_countdown_start_time');

    if (storedStartTime) {
      launchCountdownStartTime = parseInt(storedStartTime, 10);
    } else {
      launchCountdownStartTime = Date.now();
      localStorage.setItem('launch_countdown_start_time', launchCountdownStartTime.toString());
    }

    const launchTargetTime = launchCountdownStartTime + launchDurationHours * 60 * 60 * 1000;

    const updateCountdown = () => {
      const now = Date.now();
      const timeDiff = launchTargetTime - now;

      if (timeDiff <= 0) {
        setRemainingTime(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        // Optionally, redirect or show a "Launch!" message permanently
        // For now, it will just show 00:00:00:00
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
  }, [launchDurationHours, overrideQueryParam]);

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

          <div className="flex items-center justify-center text-gray-500 text-sm">
            <Clock className="w-4 h-4 mr-2" />
            <span>Countdown to a new era of Business Startup development.</span>
          </div>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
};
