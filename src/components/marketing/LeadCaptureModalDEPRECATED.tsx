import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlossyButton } from '../ui/GlossyButton';

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, agreedToTerms: boolean) => Promise<{ success: boolean; message: string }>;
  heading?: string;
  description?: string;
}

export const LeadCaptureModal: React.FC<LeadCaptureModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  heading = "Get Early Access to Premium Templates",
  description = "Join our newsletter to receive early access to exclusive templates, discounts, and development tips."
}) => {
  const [email, setEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }
    
    if (!agreedToTerms) {
      setMessage({ type: 'error', text: 'Please agree to the privacy policy' });
      return;
    }
    
    try {
      setIsSubmitting(true);
      setMessage(null);
      
      const result = await onSubmit(email, agreedToTerms);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setEmail('');
        setAgreedToTerms(false);
        // Don't close immediately on success so user can see the success message
        setTimeout(onClose, 3000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="relative w-full max-w-md"
          >
            <GlassCard className="p-8">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Content */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 dark:bg-neon-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-blue-600 dark:text-neon-green" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{heading}</h2>
                <p className="text-gray-600 dark:text-gray-300">{description}</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 dark:border-neon-green/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-green focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                      placeholder="you@example.com"
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>
                </div>
                
                {/* GDPR Checkbox */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="privacy-terms"
                    checked={agreedToTerms}
                    onChange={() => setAgreedToTerms(!agreedToTerms)}
                    className="h-5 w-5 text-blue-600 dark:text-neon-green border-gray-300 dark:border-gray-600 rounded mt-1 focus:ring-blue-500 dark:focus:ring-neon-green"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="privacy-terms" className="ml-3 text-sm text-gray-600 dark:text-gray-300">
                    I agree to the{' '}
                    <a 
                      href="/privacy" 
                      target="_blank" 
                      className="text-blue-600 dark:text-neon-green hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      privacy policy
                    </a>{' '}
                    and consent to receive marketing communications.
                  </label>
                </div>
                
                {/* Message (Success/Error) */}
                {message && (
                  <div 
                    className={`p-3 rounded-lg ${
                      message.type === 'success' 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
                    }`}
                  >
                    <div className="flex items-center">
                      {message.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      )}
                      <span className="text-sm">{message.text}</span>
                    </div>
                  </div>
                )}
                
                {/* Submit Button */}
                <GlossyButton
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe Now'}
                </GlossyButton>
                
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                  You can unsubscribe at any time. We never share your data.
                </p>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};