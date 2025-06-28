import React from 'react';
import { motion } from 'framer-motion';
import { Star, Download, ExternalLink, Github } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlossyButton } from '../ui/GlossyButton';
import type { MVP } from '../../types';

interface MVPCardProps {
  mvp: MVP;
  onClick?: () => void;
}

export const MVPCard: React.FC<MVPCardProps> = ({ mvp, onClick }) => {
  return (
    <GlassCard hover onClick={onClick} className="p-6 h-full flex flex-col">
      {/* Preview Image */}
      <div className="relative mb-4 rounded-xl overflow-hidden">
        <img
          src={mvp.preview_images[0] || 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=800'}
          alt={mvp.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-full">
            {mvp.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {mvp.title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
          {mvp.tagline}
        </p>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-2 mb-4">
          {mvp.tech_stack.slice(0, 3).map((tech) => (
            <span
              key={tech}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
            >
              {tech}
            </span>
          ))}
          {mvp.tech_stack.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full">
              +{mvp.tech_stack.length - 3} more
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium">{mvp.average_rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Download className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">{mvp.download_count}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {mvp.demo_url && (
              <motion.a
                href={mvp.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                whileHover={{ scale: 1.1 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
              </motion.a>
            )}
            {mvp.github_url && mvp.access_tier === 'free' && (
              <motion.a
                href={mvp.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.1 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Github className="w-4 h-4" />
              </motion.a>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <GlossyButton size="sm" className="w-full">
        View Details
      </GlossyButton>
    </GlassCard>
  );
};
