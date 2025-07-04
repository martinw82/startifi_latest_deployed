import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { DeploymentService } from '../lib/deployment'; // Updated import


export const BuyerNetlifyCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing Netlify authentication...');
  const [netlifyUrl, setNetlifyUrl] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (!code || !state) {
          setStatus('error');
          setMessage('Missing required parameters from Netlify callback.');
          return;
        }
        
        // Process Netlify authentication callback
        const result = await DeploymentService.completeNetlifyAuth(code, state);
        
        if (result.success) {
          setStatus('success');
          setMessage(result.message || 'Netlify site deployed successfully!');
          setNetlifyUrl(result.netlify_site_url || null);
          setDeploymentId(result.deployment_id || null);
        } else {
          setStatus('error');
          setMessage(result.message || 'Failed to complete Netlify authentication.');
        }
      } catch (error: any) {
        console.error('Error processing Netlify callback:', error);
        setStatus('error');
        setMessage(error.message || 'An unexpected error occurred.');
      }
    };
    
    processCallback();
  }, [searchParams]);

  const handleContinue = () => {
    navigate('/dashboard');
  };
  
  const handleRetry = () => {
    navigate('/dashboard'); // Could also navigate back to a specific MVP
  };
  
  const handleViewSite = () => {
    if (netlifyUrl) {
      window.open(netlifyUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Deploying Your Site
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {message}
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Deployment Successful!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {message}
              </p>
              {netlifyUrl && (
                <p className="text-blue-600 dark:text-blue-400 mb-6 break-all">
                  <a 
                    href={netlifyUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center hover:underline"
                  >
                    {netlifyUrl}
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </p>
              )}
              <div className="flex flex-col space-y-3">
                {netlifyUrl && (
                  <GlossyButton onClick={handleViewSite}>
                    View Your Site
                  </GlossyButton>
                )}
                <GlossyButton 
                  onClick={handleContinue}
                  variant="outline"
                >
                  Back to Dashboard
                </GlossyButton>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Deployment Failed
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {message}
              </p>
              <GlossyButton onClick={handleRetry}>
                Back to Dashboard
              </GlossyButton>
            </>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};