// src/components/layout/Header.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, User, Bell, Menu, X, Shield, Settings, Loader2 } from 'lucide-react';
import { GlossyButton } from '../ui/GlossyButton';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { NotificationService } from '../../lib/api';

// Import logo images
import StartifiLogoLight from '/startifi-logo-lightmode.png';
import StartifiLogoDark from '/startifi-logo-darkmode.png';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // State to track dark mode

  useEffect(() => {
    if (user) {
      fetchUnreadCount();

      // Set up an interval to refresh unread count
      const interval = setInterval(fetchUnreadCount, 60000); // Refresh every minute
      
      return () => clearInterval(interval);
    }
  }, [user]);

  // Effect to listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Initial check
    setIsDarkMode(document.documentElement.classList.contains('dark'));

    return () => observer.disconnect();
  }, []);

  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      setLoadingNotifications(true);
      const count = await NotificationService.getUnreadNotificationCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const navItems = [
    { label: 'Browse MVPs', href: '/mvps' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Become a Seller', href: '/sell' },
  ];

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/10 dark:bg-midnight-800/10 border-b border-white/20 dark:border-neon-cyan/10"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/">
            <motion.div
              className="flex items-center space-x-2 cursor-pointer pt-2.5"
              whileHover={{ scale: 1.05 }}
            >
              <img
                src={isDarkMode ? StartifiLogoDark : StartifiLogoLight}
                alt="Startifi Logo"
                className="h-60" // Changed from h-8 to h-32, then h40, then h-50, think h-60 is good
              />
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link key={item.label} to={item.href}>
                <motion.button
                  className="text-cyber-gray hover:text-neon-green transition-colors text-gray-700 dark:text-cyber-white"
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
              className="p-2 rounded-full bg-white/10 dark:bg-midnight-800/20 backdrop-blur-md border border-white/20 dark:border-neon-green/20 hover:bg-white/20 dark:hover:bg-midnight-700/30 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Search className="w-5 h-5 text-gray-700 dark:text-cyber-white" />
                    </motion.button>

            <ThemeToggle />

            {user ? (
              <div className="flex items-center space-x-3">
                <Link to="/notifications">
                  <motion.button
                     className="p-2 rounded-full bg-white/10 dark:bg-midnight-800/20 backdrop-blur-md border border-white/20 dark:border-neon-green/20 hover:bg-white/20 dark:hover:bg-midnight-700/30 transition-colors relative"
                
                    whileHover={{ scale: 1.1 }}
                    aria-label={`${unreadCount} unread notifications`}
                  >
                    {loadingNotifications ? (
                       <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                     <Bell className="w-5 h-5 text-gray-700 dark:text-cyber-white" />
                          )}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-neon-green text-midnight-900 rounded-full px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </motion.button>
                </Link>
                
                <div className="flex items-center space-x-2">
                  {/* Admin Dashboard Link */}
                  {(user.role === 'admin' || user.role === 'both') && (
                    <Link to="/admin">
                      <motion.button
                        className="p-2 rounded-full bg-neon-green/10 dark:bg-neon-green/20 border border-neon-green/30 dark:border-neon-green/40 hover:bg-neon-green/20 dark:hover:bg-neon-green/30 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        title="Admin Dashboard"
                      >
                         <Shield className="w-5 h-5 text-blue-600 dark:text-neon-green" />
                         </motion.button>
                    </Link>
                  )}
                  
                  {/* User Settings Link */}
                  <Link to="/settings">
                    <motion.button
                       className="p-2 rounded-full bg-white/10 dark:bg-midnight-800/20 backdrop-blur-md border border-white/20 dark:border-neon-green/20 hover:bg-white/20 dark:hover:bg-midnight-700/30 transition-colors"
                    
                      whileHover={{ scale: 1.1 }}
                      title="User Settings"
                    >
                      <Settings className="w-5 h-5 text-gray-700 dark:text-cyber-white" />
                      </motion.button>
                  </Link>

                  <Link to="/dashboard">
                    <motion.button
                      className="p-2 rounded-full bg-white/10 dark:bg-midnight-800/20 backdrop-blur-md border border-white/20 dark:border-neon-green/20 hover:bg-white/20 dark:hover:bg-midnight-700/30 transition-colors"
                      whileHover={{ scale: 1.1 }}
                    >
                          <User className="w-5 h-5 text-gray-700 dark:text-cyber-white" />
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
              className="md:hidden p-2 rounded-lg text-gray-700 dark:text-cyber-white"
                 onClick={() => setIsMenuOpen(!isMenuOpen)}
              whileTap={{ scale: 0.95 }}
            >
             {isMenuOpen ? <X className="w-6 h-6 text-gray-700 dark:text-cyber-white" /> : <Menu className="w-6 h-6 text-gray-700 dark:text-cyber-white" />}
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
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white/10 dark:bg-midnight-800/20 backdrop-blur-md rounded-lg mt-2 border border-white/20 dark:border-neon-cyan/20">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                     className="block w-full text-left px-3 py-2 text-gray-700 hover:text-neon-cyan transition-colors dark:text-cyber-white"
             
                >
                  {item.label}
                </Link>
              ))}
              {user && (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                      className="block w-full text-left px-3 py-2 text-gray-700 hover:text-neon-cyan transition-colors dark:text-cyber-white"
               
                  >
                    Dashboard
                  </Link>
                  <Link to="/notifications">
                    <div className="block w-full text-left px-3 py-2 text-cyber-gray hover:text-neon-cyan transition-colors text-gray-700 dark:text-cyber-white">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center ml-2 w-5 h-5 text-xs font-bold bg-neon-green text-midnight-900 rounded-full">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-3 py-2 text-cyber-gray hover:text-neon-cyan transition-colors text-gray-700 dark:text-cyber-white"
                  >
                    Settings
                  </Link>
                  {(user.role === 'admin' || user.role === 'both') && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full text-left px-3 py-2 text-neon-green hover:text-neon-green/80 transition-colors text-gray-700 dark:text-cyber-white"
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

