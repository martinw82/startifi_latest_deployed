import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  try {
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'Stripe configuration error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-04-10',
    });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { user_id, return_url, refresh_url } = await req.json();

    // Validate required fields
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!return_url || !refresh_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: return_url, refresh_url' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Verify user exists and is an approved seller
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, email, is_seller_approved, stripe_account_id')
      .eq('id', user_id)
      .single();

    if (userError || !userProfile) {
      console.error('Error fetching user profile:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found or not authorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    if (!userProfile.is_seller_approved) {
      return new Response(
        JSON.stringify({ error: 'User is not an approved seller' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Check if user already has a Stripe account
    if (userProfile.stripe_account_id) {
      // Create account link for existing account (for re-onboarding if needed)
      try {
        const accountLink = await stripe.accountLinks.create({
          account: userProfile.stripe_account_id,
          refresh_url: refresh_url,
          return_url: return_url,
          type: 'account_onboarding',
        });

        return new Response(
          JSON.stringify({
            account_link_url: accountLink.url,
            account_id: userProfile.stripe_account_id,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (stripeError: any) {
        console.error('Error creating account link for existing account:', stripeError);
        
        // If the account doesn't exist anymore in Stripe, we'll create a new one
        if (stripeError.code === 'resource_missing') {
          console.log('Existing Stripe account not found, creating new one');
        } else {
          return new Response(
            JSON.stringify({ error: 'Failed to create account link for existing account' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
      }
    }

    // Get user email from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);

    if (authError || !authUser.user) {
      console.error('Error fetching auth user:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user authentication data' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Create new Stripe Express account
    const account = await stripe.accounts.create({
      type: 'express',
      email: authUser.user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual', // Can be changed based on your needs
      metadata: {
        user_id: user_id,
        platform: 'mvp-library',
      },
    });

    console.log(`Created new Stripe Express account ${account.id} for user ${user_id}`);

    // Update user profile with Stripe account ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_account_id: account.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('Error updating user profile with Stripe account ID:', updateError);
      
      // Try to clean up the Stripe account if database update fails
      try {
        await stripe.accounts.del(account.id);
      } catch (cleanupError) {
        console.error('Failed to clean up Stripe account after database error:', cleanupError);
      }

      return new Response(
        JSON.stringify({ error: 'Failed to save Stripe account information' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refresh_url,
      return_url: return_url,
      type: 'account_onboarding',
    });

    console.log(`Created account link for user ${user_id}, account ${account.id}`);

    return new Response(
      JSON.stringify({
        account_link_url: accountLink.url,
        account_id: account.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in create-stripe-connect-account function:', error);
    
    // Return specific error messages for known Stripe errors
    let errorMessage = 'An unexpected error occurred';
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid request to Stripe';
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Stripe API error';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});