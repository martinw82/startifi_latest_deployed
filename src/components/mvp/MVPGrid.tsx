import React from 'react';
import { motion } from 'framer-motion';
import { MVPCard } from './MVPCard';
import type { MVP } from '../../types';

interface MVPGridProps {
  mvps: MVP[];
  loading?: boolean;
  onMVPClick?: (mvp: MVP) => void;
}

export const MVPGrid: React.FC<MVPGridProps> = ({ mvps, loading, onMVPClick }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse bg-white/10 backdrop-blur-md rounded-2xl p-6 h-96"
          >
            <div className="bg-gray-300 dark:bg-gray-600 h-48 rounded-xl mb-4"></div>
            <div className="space-y-3">
              <div className="bg-gray-300 dark:bg-gray-600 h-4 rounded w-3/4"></div>
              <div className="bg-gray-300 dark:bg-gray-600 h-3 rounded w-full"></div>
              <div className="bg-gray-300 dark:bg-gray-600 h-3 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (mvps.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📦</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No MVPs found
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Try adjusting your search criteria or browse different categories.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {mvps.map((mvp, index) => (
        <motion.div
          key={mvp.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <MVPCard
            mvp={mvp}
            onClick={() => onMVPClick?.(mvp)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};