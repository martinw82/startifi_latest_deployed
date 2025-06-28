import React from 'react';
import { Link } from 'react-router-dom';
import { Code2, Twitter, Github, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export const Footer: React.FC = () => {
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
    <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <motion.div
              className="flex items-center space-x-2 mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Code2 className="w-8 h-8 text-blue-400" />
              <span className="text-xl font-bold">MVP Library</span>
            </motion.div>
            <p className="text-gray-300 mb-6">
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
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <div key={section.title}>
              <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link to={link.href}>
                        <motion.a
                          className="text-gray-300 hover:text-white transition-colors"
                          whileHover={{ x: 4 }}
                        >
                          {link.label}
                        </motion.a>
                      </Link>
                    ) : (
                      <motion.a
                        href={link.href}
                        className="text-gray-300 hover:text-white transition-colors"
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

        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">
              © 2025 MVP Library. All rights reserved.
            </p>
            <p className="text-gray-400 mt-4 md:mt-0">
              Built for developers, by developers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};