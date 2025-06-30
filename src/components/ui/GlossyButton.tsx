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
  
  const lightVariantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 focus:ring-offset-white',
    secondary: 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 shadow-md hover:shadow-lg hover:from-gray-300 hover:to-gray-400 focus:ring-gray-400 focus:ring-offset-white',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus:ring-blue-500 focus:ring-offset-white',
  };

  const darkVariantClasses = {
    primary: 'bg-gradient-to-r from-neon-green to-neon-cyan text-cyber-white shadow-neon-green-glow hover:shadow-neon-green-glow hover:from-neon-green_bright hover:to-neon-cyan focus:ring-neon-green focus:ring-offset-midnight-900',
    secondary: 'bg-gradient-to-r from-cyber-gray-600 to-cyber-gray-700 text-white shadow-lg hover:shadow-xl hover:from-cyber-gray-700 hover:to-cyber-gray-800 focus:ring-cyber-gray-500 focus:ring-offset-midnight-900',
    outline: 'border-2 border-neon-green text-neon-green hover:bg-neon-green/10 hover:text-neon-green_bright focus:ring-neon-green focus:ring-offset-midnight-900',
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
        'light:text-cyber-black dark:text-cyber-white',
        'dark:' + darkVariantClasses[variant],
        lightVariantClasses[variant],
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
          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
};