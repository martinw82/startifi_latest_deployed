// src/components/layout/Footer.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Code2, Twitter, Github, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

// Import logo images
import StartifiLogoLight from '/startifi-logo-lightmode.png';
import StartifiLogoDark from '/startifi-logo-darkmode.png';

export const Footer: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false); // State to track dark mode

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

  const footerSections = [
    {
      title: 'Platform',
      links: [
        { label: 'Browse MVPs', href: '/mvps' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'How it Works', href: '/how-it-works' },
        { label: 'Success Stories', href: '/stories' },
      ],
    },
    {
      title: 'Sellers',
      links: [
        { label: 'Become a Seller', href: '/sell' },
        { label: 'Seller Guidelines', href: '/guidelines' },
        { label: 'Upload MVP', href: '/upload' },
        { label: 'Seller Dashboard', href: '/dashboard' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', href: '/help' },
        { label: 'Contact Us', href: '/contact' },
        { label: 'API Documentation', href: '/docs' },
        { label: 'Status', href: '/status' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Cookie Policy', href: '/cookies' },
        { label: 'License Terms', href: '/licenses' },
      ],
    },
  ];

  return (
    <footer className="bg-gradient-to-br from-midnight-900 via-midnight-800 to-midnight-700 text-cyber-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <motion.div
              className="flex items-center space-x-2 mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <img
                src={isDarkMode ? StartifiLogoDark : StartifiLogoLight}
                alt="Startifi Logo"
                className="h-40" // Set height for footer logo
              />
            </motion.div>
            <p className="text-cyber-gray mb-6">
              Accelerate your development with AI-ready MVP codebases. 
              Launch faster, iterate smarter.
            </p>
            <div className="flex space-x-4">
              {[
                { icon: Twitter, href: '#' },
                { icon: Github, href: '#' },
                { icon: Mail, href: '#' },
              ].map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  className="p-2 rounded-full bg-midnight-800/50 hover:bg-midnight-700/70 transition-colors border border-neon-green/20 shadow-neon-green-glow-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <social.icon className="w-5 h-5 text-neon-green" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <div key={section.title}>
              <h3 className="text-lg font-semibold mb-4 text-cyber-white">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link to={link.href}>
                        <motion.a
                          className="text-cyber-gray hover:text-neon-green transition-colors"
                          whileHover={{ x: 4 }}
                        >
                          {link.label}
                        </motion.a>
                      </Link>
                    ) : (
                      <motion.a
                        href={link.href}
                        className="text-cyber-gray hover:text-neon-green transition-colors"
                        whileHover={{ x: 4 }}
                      >
                        {link.label}
                      </motion.a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-neon-green/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-cyber-gray">
              © 2025 Startifi. All rights reserved.
            </p>
            <p className="text-cyber-gray mt-4 md:mt-0">
              Built for developers, by developers
            </p>
            {/* Bolt Badge - Made 100% larger and linked to bolt.new */}
            <a href="https://bolt.new/?rid=cz5tax" target="_blank" rel="noopener noreferrer">
              <img
                src="/black_circle_360x360_boltbadge.webp"
                alt="Powered by Bolt"
                className="w-24 h-24 fixed bottom-4 right-4" // Changed from absolute to fixed
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

