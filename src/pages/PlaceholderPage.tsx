import React from 'react';
import { motion } from 'framer-motion';
import { Construction } from 'lucide-react'; // Or any other suitable icon

interface PlaceholderPageProps {
  pageName: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ pageName }) => {
  return (
    <div className="min-h-[calc(100vh-10rem)] pt-24 pb-16 flex items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-8 rounded-lg bg-white/30 dark:bg-gray-800/30 backdrop-blur-md shadow-xl max-w-md mx-auto"
      >
        <Construction className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
          {pageName}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg mb-2">
          This page is under construction.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The content for "{pageName}" will be available soon. Thank you for your patience!
        </p>
      </motion.div>
    </div>
  );
};
