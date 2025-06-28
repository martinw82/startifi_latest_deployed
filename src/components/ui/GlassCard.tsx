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
        'backdrop-blur-md bg-white/10 dark:bg-white/5',
        'border border-white/20 dark:border-white/10',
        'rounded-2xl shadow-lg',
        'transition-all duration-300',
        hover && 'hover:bg-white/20 dark:hover:bg-white/10 hover:shadow-xl hover:scale-[1.02]',
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