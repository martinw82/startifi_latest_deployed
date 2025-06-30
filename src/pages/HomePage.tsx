import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Zap, 
  Shield, 
  Code, 
  Star, 
  Download, 
  Users, 
  Clock, 
  ExternalLink,
  Settings,
  Cpu,
  Layers,
  Globe
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { MVPCard } from '../components/mvp/MVPCard';
import { APIService } from '../lib/api';
import type { MVP } from '../types';

export const HomePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [featuredMVPs, setFeaturedMVPs] = useState<MVP[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadFeaturedMVPs = async () => {
      try {
        setLoading(true);
        const { mvps } = await APIService.getMVPs({
          limit: 6,
          sortBy: 'download_count'
        });
        setFeaturedMVPs(mvps);
      } catch (error) {
        console.error('Error loading featured MVPs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedMVPs();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-indigo-50 dark:from-midnight-900 dark:via-midnight-800 dark:to-midnight-700 transition-colors duration-300" />
        
        {/* Grid Background */}
        <div className="absolute inset-0 bg-light-grid dark:bg-cyber-grid bg-[length:50px_50px] opacity-10 transition-colors duration-300" />
        
        {/* Glowing Orbs (Background Effect) */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/20 dark:bg-neon-cyan/20 rounded-full filter blur-3xl animate-pulse-slow transition-colors duration-300"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-400/20 dark:bg-neon-violet/20 rounded-full filter blur-3xl animate-pulse-slow transition-colors duration-300" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="text-cyber-black dark:text-cyber-white transition-colors duration-300">Start Fast.</span>{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-neon-green dark:to-neon-cyan bg-clip-text text-transparent dark:animate-glow">
                  Build Bold.
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-cyber-gray mb-8 max-w-3xl mx-auto">
                Launch your MVP in hours, not months. Production-ready templates
                with auth, payments, and deployment built-in.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <Link to="/mvps">
                  <GlossyButton size="lg" className="flex items-center space-x-2">
                    <span>Explore Templates</span>
                    <ArrowRight className="w-5 h-5" />
                  </GlossyButton>
                </Link>
                
                <GlossyButton variant="outline" size="lg">
                  Watch Demo
                </GlossyButton>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
                <div className="bg-white/90 dark:bg-midnight-800/20 backdrop-blur-md rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg transition-colors duration-300">
                  <div className="text-3xl font-bold text-blue-600 dark:text-neon-green mb-1 transition-colors duration-300">
                    1,247
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                    MVPs Launched
                  </div>
                </div>
                
                <div className="bg-white/90 dark:bg-midnight-800/20 backdrop-blur-md rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg transition-colors duration-300">
                  <div className="text-3xl font-bold text-blue-600 dark:text-neon-green mb-1 transition-colors duration-300">
                    89
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                    Templates
                  </div>
                </div>
                
                <div className="bg-white/90 dark:bg-midnight-800/20 backdrop-blur-md rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg transition-colors duration-300">
                  <div className="text-3xl font-bold text-blue-600 dark:text-neon-green mb-1 transition-colors duration-300">
                    24
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                    Avg. Hours to Launch
                  </div>
                </div>
                
                <div className="bg-white/90 dark:bg-midnight-800/20 backdrop-blur-md rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg transition-colors duration-300">
                  <div className="text-3xl font-bold text-blue-600 dark:text-neon-green mb-1 transition-colors duration-300">
                    98%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                    Success Rate
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 relative transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              See How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              From idea to deployed MVP in 3 minutes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                step: '1. Choose Template',
                icon: '📦',
                description: 'Pick from our catalog of production-ready MVPs'
              },
              {
                step: '2. Customize',
                icon: '⚙️',
                description: 'All projects include easy configurations'
              },
              {
                step: '3. Deploy',
                icon: '🚀',
                description: 'One-click deployment to production'
              }
            ].map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-midnight-800/20 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300 text-center"
              >
                <div className="flex items-center justify-center mb-4 text-4xl">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {step.step}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Example UI Screenshots */}
          <div className="relative mb-16 flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-16">
            {/* Left UI Example - Code Terminal */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="w-full lg:w-2/5"
            >
              <div className="bg-gray-900 rounded-lg shadow-xl p-4 font-mono text-sm text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-xs text-gray-400">npm • live</div>
                </div>
                <div className="space-y-1">
                  <div className="flex">
                    <span className="text-green-400 mr-2">$</span>
                    <span>npx create-startifi-app my-project</span>
                  </div>
                  <div className="text-gray-400">📦 Downloading template...</div>
                  <div className="text-green-400">✅ Template downloaded successfully!</div>
                  <div className="text-gray-400">🔧 Installing dependencies...</div>
                  <div className="text-gray-400">📝 Configuring project...</div>
                  <div className="text-green-400">✅ Dependencies installed!</div>
                  <div className="text-gray-400">🔑 Setting up authentication...</div>
                  <div className="text-gray-400">💳 Configuring payments...</div>
                  <div className="text-green-400">✅ Your project is ready!</div>
                  <div className="flex">
                    <span className="text-green-400 mr-2">$</span>
                    <span>cd my-project && npm run dev</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Arrow Between Examples */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
              className="hidden lg:block"
            >
              <ArrowRight className="w-12 h-12 text-blue-500 dark:text-neon-green transition-colors duration-300" />
            </motion.div>

            {/* Right UI Example - Dashboard */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="w-full lg:w-2/5"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden transition-colors duration-300">
                <div className="bg-blue-600 dark:bg-neon-green p-4 transition-colors duration-300">
                  <h3 className="text-white dark:text-midnight-900 font-semibold transition-colors duration-300">Analytics Dashboard</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-blue-50 dark:bg-midnight-700 rounded p-3 text-center transition-colors duration-300">
                      <div className="text-2xl font-bold text-blue-700 dark:text-neon-cyan transition-colors duration-300">$12,847</div>
                      <div className="text-xs text-blue-600 dark:text-blue-300 transition-colors duration-300">Revenue</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-midnight-700 rounded p-3 text-center transition-colors duration-300">
                      <div className="text-2xl font-bold text-blue-700 dark:text-neon-cyan transition-colors duration-300">2,431</div>
                      <div className="text-xs text-blue-600 dark:text-blue-300 transition-colors duration-300">Users</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-midnight-700 rounded p-3 text-center transition-colors duration-300">
                      <div className="text-2xl font-bold text-blue-700 dark:text-neon-cyan transition-colors duration-300">+23%</div>
                      <div className="text-xs text-blue-600 dark:text-blue-300 transition-colors duration-300">Growth</div>
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 h-32 rounded mb-3 transition-colors duration-300"></div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">Based on your analytics data from last 30 days</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Templates */}
      <section className="py-16 bg-gray-50 dark:bg-midnight-800/30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              Featured MVP Templates
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors duration-300">
              Production-ready starters for every use case
            </p>
          </motion.div>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center mb-12 gap-2">
            {['all', 'saas', 'e-commerce', 'ai apps', 'mobile'].map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeCategory === category
                    ? 'bg-blue-600 dark:bg-neon-green text-white dark:text-midnight-900'
                    : 'bg-white dark:bg-midnight-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-midnight-600'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, index) => (
                <motion.div
                  key={`skeleton-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white dark:bg-midnight-800/20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg animate-pulse"
                >
                  <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="p-5 space-y-3">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </motion.div>
              ))
            ) : featuredMVPs.length > 0 ? (
              // Actual templates
              featuredMVPs.slice(0, 3).map((mvp, index) => (
                <motion.div
                  key={mvp.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <MVPCard mvp={mvp} onClick={() => navigate(`/mvp/${mvp.id}`)} />
                </motion.div>
              ))
            ) : (
              // Empty state
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No templates found</p>
              </div>
            )}
          </div>

          {/* Browse All Button */}
          <div className="text-center">
            <Link to="/mvps">
              <GlossyButton variant="outline" size="lg" className="dark:border-neon-green/50">
                Browse All Templates
              </GlossyButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Startifi */}
      <section className="py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              Why Startifi?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors duration-300">
              Skip the setup bull. Focus on your unique value proposition while we handle the boilerplate.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Save 200+ Hours',
                icon: Clock,
                description: 'Pre-built, tested, and optimized. Skip past all the configuration and get straight to building your features.'
              },
              {
                title: 'Production Ready',
                icon: Shield,
                description: 'Battle-tested stacks and best practices included. Deploy with confidence from day one.'
              },
              {
                title: 'Mobile First',
                icon: Layers,
                description: 'Responsive designs work perfectly on all device sizes and screen formats.'
              },
              {
                title: 'Global CDN',
                icon: Globe,
                description: 'Lightning-fast loading times with worldwide coverage for optimal user experience.'
              },
              {
                title: 'AI Enhanced',
                icon: Cpu,
                description: 'Smart integrations and automated optimizations powered by AI.'
              },
              {
                title: 'Community Support',
                icon: Users,
                description: 'Active community of builders sharing tips, updates, and best practices.'
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-midnight-800/20 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 mr-4 rounded-full bg-blue-100 dark:bg-neon-green/20 flex items-center justify-center transition-colors duration-300">
                    <feature.icon className="w-5 h-5 text-blue-600 dark:text-neon-green" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 ml-14 transition-colors duration-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50 dark:bg-midnight-800/30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
              Trusted by Builders
            </h2>
            <div className="flex items-center justify-center mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="ml-2 text-gray-600 dark:text-gray-300 transition-colors duration-300">
                5.0 from 1,200+ builders
              </span>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {[
              {
                quote: "Launched our MVP in just 2 days using Startifi. The template had everything we needed - auth, payments, and a smooth admin dashboard.",
                author: "Sarah Chen",
                position: "Founder, HealthTech Startup"
              },
              {
                quote: "Our investors were amazed at how quickly we built our SaaS. What they don't know is we used a template from Startifi as our foundation!",
                position: "CTO, E-learning Platform",
                author: "Mike Rodriguez"
              },
              {
                quote: "The code quality and structure is outstanding compared to other templates. It's clean, well-documented, and perfect for rapid prototyping.",
                author: "Emma Thompson",
                position: "Senior Developer, FinTech"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-midnight-800/20 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300 flex flex-col h-full"
              >
                <blockquote className="flex-grow mb-6">
                  <p className="text-gray-600 dark:text-gray-300 italic transition-colors duration-300">"{testimonial.quote}"</p>
                </blockquote>
                <footer>
                  <p className="font-semibold text-gray-900 dark:text-white transition-colors duration-300">{testimonial.author}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">{testimonial.position}</p>
                </footer>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-neon-green dark:to-neon-cyan relative overflow-hidden transition-colors duration-300">
        <div className="absolute inset-0 bg-grid-white/5 bg-[length:20px_20px] opacity-20"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white dark:text-midnight-900 mb-6 transition-colors duration-300">
              Ready to Build Your MVP?
            </h2>
            <p className="text-xl text-white/90 dark:text-midnight-800 mb-8 transition-colors duration-300">
              Join 5,000+ builders who've launched their ideas with Startifi
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <GlossyButton 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-50 border-2 border-white dark:bg-midnight-900 dark:text-neon-green dark:hover:bg-midnight-800 dark:border-2 dark:border-neon-green dark:shadow-neon-green-glow transition-colors duration-300"
              >
                Start Building Now
              </GlossyButton>
              
              <GlossyButton 
                variant="outline" 
                size="lg" 
                className="border-2 border-white text-white hover:bg-white/10 dark:border-midnight-900 dark:text-midnight-900 dark:hover:bg-midnight-900/10 transition-colors duration-300"
              >
                Watch 2-min Demo
              </GlossyButton>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};