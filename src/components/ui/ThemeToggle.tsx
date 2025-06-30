import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className="p-3 rounded-full bg-gray-100 dark:bg-midnight-800/20 backdrop-blur-md border border-light-border dark:border-neon-green/20 hover:bg-gray-200 dark:hover:bg-midnight-700/30 transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-500 dark:text-neon-green_bright" />
      ) : (
        <Moon className="w-5 h-5 text-blue-600 dark:text-neon-green" />
      )}
    </motion.button>
  );
};