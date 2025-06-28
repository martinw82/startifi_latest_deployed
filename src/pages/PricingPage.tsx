import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Building2, Loader2 } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { stripeProducts } from '../stripe-config';

const pricingPlans = [
  {
    id: 'basic',
    name: 'Basic',
    icon: Zap,
    price: 1,
    downloads: 5,
    description: 'Perfect for individual developers and small projects',
    features: [
      '5 MVP downloads per month',
      'Access to all approved MVPs',
      'Standard support',
      'License for personal & commercial use',
      'Code documentation included',
      'Basic AI usage guides',
    ],
    popular: false,
    priceId: 'price_1RaOyjFZEiAUOo3FYIhi7LWH',
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Crown,
    price: 2,
    downloads: 15,
    description: 'Ideal for growing teams and multiple projects',
    features: [
      '15 MVP downloads per month',
      'Priority access to new releases',
      'Premium support',
      'Extended commercial license',
      'Advanced AI integration guides',
      'Custom modification examples',
      'Team collaboration features',
    ],
    popular: true,
    priceId: 'price_1RaOzLFZEiAUOo3FXQ6N5KpK',
  },
  {
    id: 'premium',
    name: 'Premium',
    icon: Building2,
    price: 3,
    downloads: 35,
    description: 'For agencies and large development teams',
    features: [
      '35 MVP downloads per month',
      'Early access to beta releases',
      'White-label licensing',
      'Dedicated support manager',
      'Custom AI prompt templates',
      'Source code modification rights',
      'Priority feature requests',
      'Monthly architecture reviews',
    ],
    popular: false,
    priceId: 'price_1RaP06FZEiAUOo3F4ifxXaj0',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    price: null,
    downloads: null,
    description: 'Custom solutions for large organizations',
    features: [
      'Unlimited MVP downloads',
      'Custom MVP development',
      'On-premise deployment options',
      'Dedicated success manager',
      'Custom integrations',
      'SLA guarantees',
      'Security compliance (SOC2, GDPR)',
      'Training & onboarding',
    ],
    popular: false,
    priceId: null,
  },
];

export const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'enterprise') {
      // Contact sales for enterprise
      window.location.href = '/contact';
      return;
    }

    if (!user) {
      // Redirect to auth page if not logged in
      window.location.href = '/auth';
      return;
    }

    const plan = pricingPlans.find(p => p.id === planId);
    if (!plan || !plan.priceId) {
      setError('Invalid plan selected');
      return;
    }

    setLoadingPlan(planId);
    setError(null);

    try {
      // Get the current origin for redirect URLs
      const origin = window.location.origin;
      
      // Call Supabase Edge Function to create Stripe checkout session
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: plan.priceId,
          mode: 'subscription',
          success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/pricing?canceled=true`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      setError(error.message || 'Failed to start checkout process. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Choose Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Access premium MVP templates with flexible pricing designed to scale with your development needs.
            All plans include our AI-ready codebase guarantee.
          </p>
          
          {/* Money Back Guarantee */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">30-day money-back guarantee</span>
          </div>

          {/* Authentication Notice */}
          {!user && (
            <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg max-w-md mx-auto">
              <p className="text-sm">
                Please <a href="/auth" className="underline font-medium">sign in</a> to subscribe to a plan
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg max-w-md mx-auto">
              <p className="text-sm">{error}</p>
            </div>
          )}
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <GlassCard 
                className={`p-8 h-full flex flex-col ${
                  plan.popular ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                }`}
              >
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <plan.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    {plan.description}
                  </p>
                  
                  <div className="mb-6">
                    {plan.price ? (
                      <div>
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          £{plan.price}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300 ml-2">
                          /month
                        </span>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        Custom Pricing
                      </div>
                    )}
                    
                    {plan.downloads && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {plan.downloads} downloads/month
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="flex-grow">
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start space-x-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="mt-8">
                  <GlossyButton
                    onClick={() => handleSelectPlan(plan.id)}
                    className="w-full"
                    variant={plan.popular ? 'primary' : 'outline'}
                    disabled={loadingPlan === plan.id}
                    loading={loadingPlan === plan.id}
                  >
                    {loadingPlan === plan.id ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      plan.id === 'enterprise' ? 'Contact Sales' : 'Get Started'
                    )}
                  </GlossyButton>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                question: 'What happens if I exceed my download limit?',
                answer: 'You can upgrade your plan at any time, or wait until your next billing cycle. Downloads reset monthly.',
              },
              {
                question: 'Can I cancel my subscription anytime?',
                answer: 'Yes, you can cancel anytime. You\'ll retain access to downloaded MVPs and can continue using them.',
              },
              {
                question: 'What licensing comes with the MVPs?',
                answer: 'Most MVPs include commercial licensing. Check individual MVP pages for specific licensing terms.',
              },
              {
                question: 'Do you offer refunds?',
                answer: 'Yes, we offer a 30-day money-back guarantee on all subscription plans.',
              },
            ].map((faq, index) => (
              <GlassCard key={index} className="p-6 text-left">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {faq.answer}
                </p>
              </GlassCard>
            ))}
          </div>
          
          <div className="mt-12">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Still have questions?
            </p>
            <GlossyButton variant="outline">
              Contact Support
            </GlossyButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
};