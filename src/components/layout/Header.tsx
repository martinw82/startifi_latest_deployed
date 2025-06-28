// src/components/layout/Header.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Code2, Search, User, Bell, Menu, X, Shield, Settings } from 'lucide-react'; // Import Settings icon
import { GlossyButton } from '../ui/GlossyButton';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  const navItems = [
    { label: 'Browse MVPs', href: '/mvps' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Become a Seller', href: '/sell' },
  ];

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/10 dark:bg-gray-900/10 border-b border-white/20"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/">
            <motion.div
              className="flex items-center space-x-2 cursor-pointer"
              whileHover={{ scale: 1.05 }}
            >
              <Code2 className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MVP Library
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link key={item.label} to={item.href}>
                <motion.button
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  whileHover={{ scale: 1.1 }}
                >
                  {item.label}
                </motion.button>
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <motion.button
              className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Search className="w-5 h-5" />
            </motion.button>

            <ThemeToggle />

            {user ? (
              <div className="flex items-center space-x-3">
                <motion.button
                  className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-colors relative"
                  whileHover={{ scale: 1.1 }}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                </motion.button>
                
                <div className="flex items-center space-x-2">
                  {/* Admin Dashboard Link */}
                  {(user.role === 'admin' || user.role === 'both') && (
                    <Link to="/admin">
                      <motion.button
                        className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        title="Admin Dashboard"
                      >
                        <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </motion.button>
                    </Link>
                  )}
                  
                  {/* User Settings Link */}
                  <Link to="/settings">
                    <motion.button
                      className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      title="User Settings"
                    >
                      <Settings className="w-5 h-5" />
                    </motion.button>
                  </Link>

                  <Link to="/dashboard">
                    <motion.button
                      className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-colors"
                      whileHover={{ scale: 1.1 }}
                    >
                      <User className="w-5 h-5" />
                    </motion.button>
                  </Link>
                  <GlossyButton
                    variant="outline"
                    size="sm"
                    onClick={signOut}
                  >
                    Sign Out
                  </GlossyButton>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/auth">
                  <GlossyButton
                    variant="outline"
                    size="sm"
                  >
                    Sign In
                  </GlossyButton>
                </Link>
                <Link to="/auth">
                  <GlossyButton
                    size="sm"
                  >
                    Get Started
                  </GlossyButton>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <motion.button
              className="md:hidden p-2 rounded-lg"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              whileTap={{ scale: 0.95 }}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            className="md:hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white/10 backdrop-blur-md rounded-lg mt-2 border border-white/20">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              {user && (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Settings
                  </Link>
                  {(user.role === 'admin' || user.role === 'both') && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full text-left px-3 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};
