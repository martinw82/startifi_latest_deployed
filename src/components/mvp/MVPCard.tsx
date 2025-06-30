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
    <GlassCard hover onClick={onClick} className="p-6 h-full flex flex-col card-hover">
      {/* Preview Image */}
      <div className="relative mb-4 rounded-xl overflow-hidden">
        <img
          src={mvp.preview_images[0] || 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=800'}
          alt={mvp.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-900/80 to-transparent" />
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-neon-green to-neon-cyan text-midnight-900 font-bold rounded-full shadow-neon-green-glow-sm">
            {mvp.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow">
        <h3 className="text-xl font-bold text-cyber-white mb-2 line-clamp-2">
          <span className="text-neon-green">{mvp.title}</span>
        </h3>
        
        <p className="text-cyber-gray text-sm mb-4 line-clamp-2">
          {mvp.tagline}
        </p>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-2 mb-4">
          {mvp.tech_stack.slice(0, 3).map((tech) => (
            <span
              key={tech}
              className="px-2 py-1 text-xs bg-midnight-800/50 text-neon-green border border-neon-green/30 rounded-full"
            >
              {tech}
            </span>
          ))}
          {mvp.tech_stack.length > 3 && (
            <span className="px-2 py-1 text-xs bg-midnight-800/50 text-cyber-gray border border-neon-violet/20 rounded-full">
              +{mvp.tech_stack.length - 3} more
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-neon-green_bright fill-current" />
              <span className="text-sm font-medium text-cyber-white">{mvp.average_rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Download className="w-4 h-4 text-cyber-gray" />
              <span className="text-sm text-cyber-gray">{mvp.download_count}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {mvp.demo_url && (
              <motion.a
                href={mvp.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green/20 transition-colors"
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
                className="p-1.5 rounded-full bg-neon-violet/10 text-neon-violet border border-neon-violet/30 hover:bg-neon-violet/20 transition-colors"
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
      <GlossyButton size="sm" className="w-full bg-gradient-to-r from-neon-green to-neon-cyan text-midnight-900 font-bold">
        View Details
      </GlossyButton>
    </GlassCard>
  );
};
