import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hover = false,
  onClick,
}) => {
  return (
    <motion.div
      className={clsx(
        'backdrop-blur-md bg-white dark:bg-midnight-800/10',
        'border border-light-border dark:border-neon-green/20',
        'rounded-2xl shadow-glass-light dark:shadow-lg',
        'transition-all duration-300 text-cyber-black dark:text-cyber-white',
        hover && 'hover:bg-gray-50 dark:hover:bg-midnight-700/30 hover:shadow-glass-light dark:hover:shadow-neon-green-glow hover:scale-[1.02]',
        onClick && 'cursor-pointer',
        className
      )}
      whileHover={hover ? { y: -4 } : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};