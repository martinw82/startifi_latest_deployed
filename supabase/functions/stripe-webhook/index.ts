import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'MVP Library Platform',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Map price IDs to download quotas based on subscription plans
const PLAN_QUOTAS: Record<string, { downloads: number; planName: string }> = {
  'price_1RaOyjFZEiAUOo3FYIhi7LWH': { downloads: 5, planName: 'basic' },     // Basic plan
  'price_1RaOzLFZEiAUOo3FXQ6N5KpK': { downloads: 15, planName: 'pro' },      // Pro plan
  'price_1RaP06FZEiAUOo3F4ifxXaj0': { downloads: 35, planName: 'premium' },  // Premium plan
};

const FREE_TIER_DOWNLOADS = 0;

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    console.warn('No data object in webhook event');
    return;
  }

  console.info(`Processing webhook event: ${event.type}`);

  // Handle different event types
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event);
      break;
    
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event);
      break;
    
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event);
      break;
    
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event);
      break;
    
    case 'invoice.payment_failed':
      await handlePaymentFailed(event);
      break;
    
    case 'payment_intent.succeeded':
      // Handle one-time payments (not subscription-related)
      if ((event.data.object as Stripe.PaymentIntent).invoice === null) {
        await handleOneTimePayment(event);
      }
      break;
    
    case 'account.updated':
      await handleAccountUpdated(event);
      break;
    
    case 'transfer.created':
      await handleTransferCreated(event);
      break;
    
    case 'transfer.paid':
      await handleTransferPaid(event);
      break;
    
    case 'transfer.failed':
      await handleTransferFailed(event);
      break;
    
    default:
      console.info(`Unhandled webhook event type: ${event.type}`);
  }
}

async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;
  
  console.info(`Processing subscription created for customer: ${customerId}`);
  
  try {
    // Sync subscription data with Stripe
    await syncCustomerFromStripe(customerId);
    
    // Update user profile with new subscription benefits
    await updateUserProfileFromSubscription(subscription, customerId);
    
    console.info(`Successfully processed subscription creation for customer: ${customerId}`);
  } catch (error) {
    console.error(`Error processing subscription created for customer ${customerId}:`, error);
    throw error;
  }
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;
  
  console.info(`Processing subscription updated for customer: ${customerId}`);
  
  try {
    // Sync subscription data with Stripe
    await syncCustomerFromStripe(customerId);
    
    // Update user profile with updated subscription benefits
    await updateUserProfileFromSubscription(subscription, customerId);
    
    console.info(`Successfully processed subscription update for customer: ${customerId}`);
  } catch (error) {
    console.error(`Error processing subscription updated for customer ${customerId}:`, error);
    throw error;
  }
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;
  
  console.info(`Processing subscription deleted for customer: ${customerId}`);
  
  try {
    // Update subscription status to canceled
    const { error: subError } = await supabase
      .from('stripe_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId);

    if (subError) {
      console.error('Error updating subscription status to canceled:', subError);
      throw new Error('Failed to update subscription status');
    }

    // Get user_id from customer mapping
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .single();

    if (customerError || !customerData) {
      console.error('Error finding user for canceled subscription:', customerError);
      throw new Error('Failed to find user for canceled subscription');
    }

    // Reset user to free tier
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        downloads_remaining: FREE_TIER_DOWNLOADS,
        last_quota_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerData.user_id);

    if (profileError) {
      console.error('Error resetting user to free tier:', profileError);
      throw new Error('Failed to reset user to free tier');
    }

    console.info(`Successfully processed subscription deletion for customer: ${customerId}`);
  } catch (error) {
    console.error(`Error processing subscription deleted for customer ${customerId}:`, error);
    throw error;
  }
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const customerId = session.customer as string;
  
  console.info(`Processing checkout completed for customer: ${customerId}`);
  
  if (!customerId) {
    console.error('No customer ID found in checkout session');
    return;
  }

  const isSubscription = session.mode === 'subscription';

  if (isSubscription) {
    console.info('Processing subscription checkout session');
    await syncCustomerFromStripe(customerId);
    
    // If this is a subscription checkout, the subscription events will handle profile updates
    console.info(`Subscription checkout completed for customer: ${customerId}`);
  } else if (session.mode === 'payment' && session.payment_status === 'paid') {
    console.info('Processing one-time payment checkout session');
    
    try {
      // Insert the order into the stripe_orders table
      const { error: orderError } = await supabase.from('stripe_orders').insert({
        checkout_session_id: session.id,
        payment_intent_id: session.payment_intent as string,
        customer_id: customerId,
        amount_subtotal: session.amount_subtotal,
        amount_total: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        status: 'completed',
      });

      if (orderError) {
        console.error('Error inserting order:', orderError);
        throw new Error('Failed to insert order');
      }
      
      console.info(`Successfully processed one-time payment for session: ${session.id}`);
    } catch (error) {
      console.error('Error processing one-time payment:', error);
      throw error;
    }
  }
}

async function handlePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  
  console.info(`Payment succeeded for customer: ${customerId}, invoice: ${invoice.id}`);
  
  // Log successful payment - could trigger email notifications in the future
  try {
    // Get user_id for potential notification
    const { data: customerData } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .single();

    if (customerData) {
      console.info(`Payment successful for user: ${customerData.user_id}`);
      // TODO: Add email notification logic here
    }
  } catch (error) {
    console.error('Error logging payment success:', error);
  }
}

async function handlePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  
  console.warn(`Payment failed for customer: ${customerId}, invoice: ${invoice.id}`);
  
  // Log failed payment - could trigger email notifications in the future
  try {
    // Get user_id for potential notification
    const { data: customerData } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .single();

    if (customerData) {
      console.warn(`Payment failed for user: ${customerData.user_id}`);
      // TODO: Add email notification logic here
      // TODO: Consider suspending access after multiple failed payments
    }
  } catch (error) {
    console.error('Error logging payment failure:', error);
  }
}

async function handleOneTimePayment(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  console.info(`One-time payment succeeded: ${paymentIntent.id}`);
  // One-time payments are already handled in checkout.session.completed
}

async function handleAccountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;
  console.info(`Processing account update for account: ${account.id}`);
  
  try {
    // Find user by stripe_account_id
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, is_seller_approved')
      .eq('stripe_account_id', account.id)
      .single();

    if (userError || !userProfile) {
      console.warn(`No user found for Stripe account: ${account.id}`);
      return;
    }

    // Check if account is fully onboarded
    const isFullyOnboarded = account.details_submitted && 
                           account.charges_enabled && 
                           account.payouts_enabled;

    if (isFullyOnboarded && !userProfile.is_seller_approved) {
      // Auto-approve seller if their Stripe account is fully set up
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_seller_approved: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userProfile.id);

      if (updateError) {
        console.error('Error auto-approving seller:', updateError);
      } else {
        console.info(`Auto-approved seller ${userProfile.id} after Stripe onboarding completion`);
        
        // TODO: Send welcome email to newly approved seller
      }
    }

    console.info(`Successfully processed account update for account: ${account.id}`);
  } catch (error) {
    console.error(`Error processing account update for account ${account.id}:`, error);
  }
}

async function handleTransferCreated(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer;
  console.info(`Transfer created: ${transfer.id} for ${transfer.amount} ${transfer.currency}`);
  
  try {
    // Log transfer creation - this could be used for payout tracking
    if (transfer.metadata?.payout_id) {
      const { error: payoutError } = await supabase
        .from('payouts')
        .update({
          stripe_transfer_id: transfer.id,
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transfer.metadata.payout_id);

      if (payoutError) {
        console.error('Error updating payout with transfer ID:', payoutError);
      } else {
        console.info(`Updated payout ${transfer.metadata.payout_id} with transfer ${transfer.id}`);
      }
    }
  } catch (error) {
    console.error('Error handling transfer created:', error);
  }
}

async function handleTransferPaid(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer;
  console.info(`Transfer paid: ${transfer.id}`);
  
  try {
    if (transfer.metadata?.payout_id) {
      const { error: payoutError } = await supabase
        .from('payouts')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transfer.metadata.payout_id);

      if (payoutError) {
        console.error('Error marking payout as completed:', payoutError);
      } else {
        console.info(`Marked payout ${transfer.metadata.payout_id} as completed`);
        
        // Create notification for the seller
        try {
          const amountInUSD = transfer.amount / 100; // Convert from cents to dollars
          const { error: notificationError } = await supabase.from('notifications').insert([{
            user_id: transfer.metadata.seller_id,
            type: 'payout_completed',
            message: `Your payout of $${amountInUSD.toFixed(2)} for ${transfer.metadata.month_year} has been completed.`,
            link: '/payouts',
            read: false
          }]);
          
          if (notificationError) {
            console.error('Error creating payout completion notification:', notificationError);
          }
        } catch (notificationError) {
          console.error('Error creating payout notification:', notificationError);
        }
      }
    }
  } catch (error) {
    console.error('Error handling transfer paid:', error);
  }
}

async function handleTransferFailed(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer;
  console.error(`Transfer failed: ${transfer.id}`);
  
  try {
    if (transfer.metadata?.payout_id) {
      const { error: payoutError } = await supabase
        .from('payouts')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transfer.metadata.payout_id);

      if (payoutError) {
        console.error('Error marking payout as failed:', payoutError);
      } else {
        console.info(`Marked payout ${transfer.metadata.payout_id} as failed`);
        
        // Create notification for the seller
        try {
          const { error: notificationError } = await supabase.from('notifications').insert([{
            user_id: transfer.metadata.seller_id,
            type: 'payout_failed',
            message: `Your payout for ${transfer.metadata.month_year} has failed. Please check your Stripe account and contact support if needed.`,
            link: '/payouts',
            read: false
          }]);
          
          if (notificationError) {
            console.error('Error creating payout failure notification:', notificationError);
          }
        } catch (notificationError) {
          console.error('Error creating payout notification:', notificationError);
        }
      }
    }
  } catch (error) {
    console.error('Error handling transfer failed:', error);
  }
}

async function updateUserProfileFromSubscription(subscription: Stripe.Subscription, customerId: string) {
  try {
    // Get the price_id from the subscription
    const priceId = subscription.items.data[0]?.price?.id;
    
    if (!priceId) {
      console.error('No price ID found in subscription');
      return;
    }

    // Get user_id from customer mapping
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .single();

    if (customerError || !customerData) {
      console.error('Error finding user for subscription:', customerError);
      throw new Error('Failed to find user for subscription');
    }

    // Determine download quota based on plan
    const planQuota = PLAN_QUOTAS[priceId];
    if (!planQuota) {
      console.warn(`Unknown price ID: ${priceId}, using free tier`);
      // For unknown plans, default to free tier
      await updateUserProfile(customerData.user_id, customerId, FREE_TIER_DOWNLOADS, subscription.current_period_start);
      return;
    }

    console.info(`Updating user ${customerData.user_id} to ${planQuota.planName} plan with ${planQuota.downloads} downloads`);
    
    // Update user profile with new quota
    await updateUserProfile(
      customerData.user_id,
      customerId,
      planQuota.downloads,
      subscription.current_period_start
    );

  } catch (error) {
    console.error('Error updating user profile from subscription:', error);
    throw error;
  }
}

async function updateUserProfile(
  userId: string,
  customerId: string,
  downloadsRemaining: number,
  periodStart: number
) {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      downloads_remaining: downloadsRemaining,
      last_quota_reset_at: new Date(periodStart * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    console.error('Error updating user profile:', profileError);
    throw new Error('Failed to update user profile');
  }

  console.info(`Successfully updated profile for user: ${userId}`);
}

// Enhanced syncCustomerFromStripe function based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    console.info(`Syncing customer data from Stripe: ${customerId}`);
    
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      console.info(`No subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          status: 'not_started',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
      return;
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status as any,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}