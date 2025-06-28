import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { getProductByPriceId } from '../stripe-config';

interface SubscriptionData {
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching subscription:', fetchError);
        setError('Failed to fetch subscription data');
        return;
      }

      setSubscription(data);
    } catch (err: any) {
      console.error('Error in fetchSubscription:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionPlan = () => {
    if (!subscription || !subscription.price_id) {
      return null;
    }

    const product = getProductByPriceId(subscription.price_id);
    return product ? {
      name: product.name,
      description: product.description,
      isActive: subscription.subscription_status === 'active',
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      paymentMethod: subscription.payment_method_brand && subscription.payment_method_last4 
        ? `${subscription.payment_method_brand} •••• ${subscription.payment_method_last4}`
        : null,
    } : null;
  };

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    plan: getSubscriptionPlan(),
  };
};