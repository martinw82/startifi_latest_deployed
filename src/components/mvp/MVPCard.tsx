import React from 'react';
import { motion } from 'framer-motion';
import { Star, Download, ExternalLink, Github } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlossyButton } from '../ui/GlossyButton'; 
import { Link } from 'react-router-dom';
import type { MVP } from '../../types';

interface MVPCardProps {
  mvp: MVP;
  onClick?: () => void;
}

export const MVPCard: React.FC<MVPCardProps> = ({ mvp, onClick }) => {
  return (
    <GlassCard hover onClick={onClick} className="p-6 h-full flex flex-col card-hover">
      {/* Preview Image */}
      <div className="relative mb-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <img
          src={mvp.preview_images[0] || 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=800'}
          alt={mvp.title}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-neon-green dark:to-neon-cyan text-white dark:text-midnight-900 font-bold rounded-full shadow-sm dark:shadow-neon-green-glow-sm transition-colors duration-300">
            {mvp.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow">
        <h3 className="text-xl font-bold text-cyber-white mb-2 line-clamp-2">
          <span className="text-gray-900 dark:text-neon-green transition-colors duration-300">{mvp.title}</span>
        </h3>
        
        <p className="text-gray-600 dark:text-cyber-gray text-sm mb-4 line-clamp-2 transition-colors duration-300">
          {mvp.tagline}
        </p>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-2 mb-4">
          {mvp.tech_stack.slice(0, 3).map((tech) => (
            <span
              key={tech}
              className="px-2 py-1 text-xs bg-blue-50 dark:bg-midnight-800/50 text-blue-600 dark:text-neon-green border border-blue-200 dark:border-neon-green/30 rounded-full transition-colors duration-300"
            >
              {tech}
            </span>
          ))}
          {mvp.tech_stack.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-midnight-800/50 text-gray-500 dark:text-cyber-gray border border-gray-200 dark:border-neon-violet/20 rounded-full transition-colors duration-300">
              +{mvp.tech_stack.length - 3} more
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium text-gray-700 dark:text-cyber-white transition-colors duration-300">{mvp.average_rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Download className="w-4 h-4 text-gray-500 dark:text-cyber-gray transition-colors duration-300" />
              <span className="text-sm text-gray-500 dark:text-cyber-gray transition-colors duration-300">{mvp.download_count}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Seller Link - if seller info is available */}
            {mvp.seller && mvp.seller.username && (
              <Link 
                to={`/seller/${mvp.seller.username}`} 
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-cyber-gray hover:text-neon-cyan transition-colors"
              >
                by @{mvp.seller.username}
              </Link>
            )}
            
            {mvp.demo_url && (
              <motion.a
                href={mvp.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full bg-blue-100 dark:bg-neon-green/10 text-blue-600 dark:text-neon-green border border-blue-200 dark:border-neon-green/30 hover:bg-blue-200 dark:hover:bg-neon-green/20 transition-colors duration-300"
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
                className="p-1.5 rounded-full bg-indigo-100 dark:bg-neon-violet/10 text-indigo-600 dark:text-neon-violet border border-indigo-200 dark:border-neon-violet/30 hover:bg-indigo-200 dark:hover:bg-neon-violet/20 transition-colors duration-300"
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
      <GlossyButton size="sm" className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-neon-green dark:to-neon-cyan text-white dark:text-midnight-900 font-bold transition-colors duration-300">
        View Details
      </GlossyButton>
    </GlassCard>
  );
};
