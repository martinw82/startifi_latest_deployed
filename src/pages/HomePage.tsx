import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Code, Star, Download, Users } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { MVPCard } from '../components/mvp/MVPCard';
import { APIService } from '../lib/api';
import type { MVP } from '../types';

// Mock data for featured MVPs
const featuredMVPs = [
  {
    id: '1',
    seller_id: '1',
    title: 'SaaS Starter Kit',
    slug: 'saas-starter-kit',
    tagline: 'Complete SaaS boilerplate with authentication, payments, and dashboard',
    description: 'A comprehensive SaaS starter kit built with Next.js, Supabase, and Stripe.',
    features: ['User Authentication', 'Stripe Integration', 'Admin Dashboard', 'API Routes'],
    tech_stack: ['Next.js', 'TypeScript', 'Supabase', 'Stripe', 'Tailwind CSS'],
    category: 'SaaS',
    ipfs_hash: 'QmExample1',
    file_size: 15728640,
    preview_images: ['https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=800'],
    demo_url: 'https://demo.example.com',
    github_url: 'https://github.com/example/saas-kit',
    licensing_terms: 'standard_commercial' as const,
    status: 'approved' as const,
    version_number: '1.0.0',
    download_count: 1247,
    average_rating: 4.8,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    published_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    seller_id: '2',
    title: 'E-commerce Platform',
    slug: 'ecommerce-platform',
    tagline: 'Modern e-commerce solution with cart, payments, and inventory',
    description: 'Full-featured e-commerce platform with React and Node.js.',
    features: ['Shopping Cart', 'Payment Processing', 'Inventory Management', 'Order Tracking'],
    tech_stack: ['React', 'Node.js', 'MongoDB', 'Stripe', 'Express'],
    category: 'E-commerce',
    ipfs_hash: 'QmExample2',
    file_size: 12582912,
    preview_images: ['https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=800'],
    demo_url: 'https://shop-demo.example.com',
    licensing_terms: 'standard_commercial' as const,
    status: 'approved' as const,
    version_number: '2.1.0',
    download_count: 892,
    average_rating: 4.6,
    created_at: '2024-01-10T14:30:00Z',
    updated_at: '2024-01-10T14:30:00Z',
    published_at: '2024-01-10T14:30:00Z',
  },
  {
    id: '3',
    seller_id: '3',
    title: 'Portfolio Template',
    slug: 'portfolio-template',
    tagline: 'Beautiful portfolio website for developers and designers',
    description: 'Responsive portfolio template with dark mode and animations.',
    features: ['Responsive Design', 'Dark Mode', 'Animations', 'SEO Optimized'],
    tech_stack: ['Vue.js', 'Nuxt.js', 'SCSS', 'Framer Motion'],
    category: 'Portfolio',
    ipfs_hash: 'QmExample3',
    file_size: 8388608,
    preview_images: ['https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800'],
    demo_url: 'https://portfolio-demo.example.com',
    github_url: 'https://github.com/example/portfolio',
    licensing_terms: 'personal_use_only' as const,
    status: 'approved' as const,
    version_number: '1.2.0',
    download_count: 1564,
    average_rating: 4.9,
    created_at: '2024-01-05T09:15:00Z',
    updated_at: '2024-01-05T09:15:00Z',
    published_at: '2024-01-05T09:15:00Z',
  },
];

const features = [
  {
    icon: Code,
    title: 'AI-Ready Codebases',
    description: 'Every MVP is optimized for AI agents with clean architecture, comprehensive documentation, and example prompts.',
  },
  {
    icon: Zap,
    title: 'Launch Faster',
    description: 'Skip months of boilerplate development. Get production-ready code that you can customize and deploy immediately.',
  },
  {
    icon: Shield,
    title: 'Quality Assured',
    description: 'All MVPs undergo rigorous security scanning, code review, and quality assessment before approval.',
  },
];

const stats = [
  { icon: Users, value: '10K+', label: 'Active Developers' },
  { icon: Code, value: '500+', label: 'MVP Templates' },
  { icon: Download, value: '25K+', label: 'Downloads' },
  { icon: Star, value: '4.9', label: 'Average Rating' },
];

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-midnight-900 via-midnight-800 to-midnight-700" />
        
        {/* Particle/Grid Background */}
        <div className="absolute inset-0 bg-cyber-grid bg-[length:50px_50px] opacity-10" />
        
        {/* Glowing Orbs (Background Effect) */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-cyan/20 rounded-full filter blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-violet/20 rounded-full filter blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.1%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-cyber-white mb-6">
                Launch Faster.{' '}
                <span className="bg-gradient-to-r from-neon-cyan to-neon-violet bg-clip-text text-transparent animate-glow">
                  Build Smarter.
                </span>
              </h1>
              
              <p className="text-xl text-cyber-gray mb-8 max-w-3xl mx-auto">
                Access a premium library of AI-ready MVP codebases. 
                Skip the boilerplate, accelerate your development, and launch your ideas faster than ever.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <GlossyButton size="lg" className="flex items-center space-x-2">
                  <span>Explore MVPs</span>
                  <ArrowRight className="w-5 h-5" />
                </GlossyButton>
                
                <GlossyButton variant="outline" size="lg">
                  Watch Demo
                </GlossyButton>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                  >
                    <GlassCard className="p-6 text-center">
                      <stat.icon className="w-8 h-8 text-neon-cyan mx-auto mb-2" />
                      <div className="text-2xl font-bold text-cyber-white mb-1">
                        {stat.value}
                      </div>
                      <div className="text-sm text-cyber-gray">
                        {stat.label}
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured MVPs */}
      <section className="py-16 bg-gradient-to-b from-transparent to-midnight-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-cyber-white mb-4">
              Featured MVPs
            </h2>
            <p className="text-lg text-cyber-gray max-w-2xl mx-auto">
              Discover our most popular and highly-rated MVP templates from our growing library.
            </p>
          </motion.div>

          <FeaturedMVPsSection />

          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <GlossyButton size="lg" variant="outline">
              <Link to="/mvps">View All MVPs</Link>
            </GlossyButton>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute -right-64 top-1/3 w-96 h-96 bg-neon-violet/10 rounded-full filter blur-[100px]"></div>
        <div className="absolute -left-64 bottom-1/3 w-96 h-96 bg-neon-cyan/10 rounded-full filter blur-[100px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-cyber-white mb-4">
              Why Choose MVP Library?
            </h2>
            <p className="text-lg text-cyber-gray max-w-2xl mx-auto">
              We're not just another code marketplace. We're your development acceleration platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <GlassCard className="p-8 text-center h-full card-3d">
                  <div className="w-16 h-16 bg-gradient-to-r from-neon-cyan to-neon-violet rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-neon-glow-sm">
                    <feature.icon className="w-8 h-8 text-cyber-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-cyber-white mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-cyber-gray">
                    {feature.description}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-neon-cyan to-neon-violet">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-midnight-900 mb-6">
              Ready to Accelerate Your Development?
            </h2>
            <p className="text-xl text-midnight-800 mb-8">
              Join thousands of developers who are building faster with our AI-ready MVP library.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <GlossyButton 
                size="lg" 
                className="bg-midnight-900 text-neon-cyan hover:bg-midnight-800 border-2 border-neon-cyan"
              >
                Get Started Free
              </GlossyButton>
              <GlossyButton 
                size="lg" 
                variant="outline"
                className="border-midnight-900 text-midnight-900 hover:bg-midnight-900/10"
              >
                Become a Seller
              </GlossyButton>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

// Component to fetch and display featured MVPs
const FeaturedMVPsSection: React.FC = () => {
  const [mvps, setMvps] = useState<MVP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedMVPs = async () => {
      try {
        const { mvps: loadedMVPs } = await APIService.getMVPs({
          limit: 6,
          sortBy: 'download_count'
        });
        setMvps(loadedMVPs);
      } catch (error) {
        console.error('Error loading featured MVPs:', error);
        // Use fallback demo data if real data fails to load
        setMvps(featuredMVPs);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedMVPs();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse bg-white/10 backdrop-blur-md rounded-2xl p-6 h-96"
          >
            <div className="bg-gray-300 dark:bg-gray-600 h-48 rounded-xl mb-4"></div>
            <div className="space-y-3">
              <div className="bg-gray-300 dark:bg-gray-600 h-4 rounded w-3/4"></div>
              <div className="bg-gray-300 dark:bg-gray-600 h-3 rounded w-full"></div>
              <div className="bg-gray-300 dark:bg-gray-600 h-3 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
      {mvps.slice(0, 3).map((mvp, index) => (
        <motion.div
          key={mvp.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: index * 0.2 }}
          viewport={{ once: true }}
        >
          <MVPCard mvp={mvp} onClick={() => window.location.href = `/mvp/${mvp.id}`} />
        </motion.div>
      ))}
    </div>
  );
};