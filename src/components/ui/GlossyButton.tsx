import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface GlossyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const GlossyButton: React.FC<GlossyButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  ...props
}) => {
  const baseClasses = 'relative rounded-full font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-midnight-900';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-neon-cyan to-neon-violet text-cyber-white shadow-neon-glow hover:shadow-neon-glow hover:from-neon-cyan hover:to-neon-violet focus:ring-neon-violet',
    secondary: 'bg-gradient-to-r from-cyber-gray-600 to-cyber-gray-700 text-white shadow-lg hover:shadow-xl hover:from-cyber-gray-700 hover:to-cyber-gray-800 focus:ring-cyber-gray-500',
    outline: 'border-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 focus:ring-neon-cyan',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        loading && 'opacity-75 cursor-not-allowed',
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
};