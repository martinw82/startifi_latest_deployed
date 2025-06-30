import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
});

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
    const { payoutId } = await req.json();

    if (!payoutId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: payoutId' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get payout details
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .select(`
        *,
        profiles!payouts_seller_id_fkey(id, stripe_account_id)
      `)
      .eq('id', payoutId)
      .single();

    if (payoutError) {
      console.error('Error fetching payout:', payoutError);
      return new Response(
        JSON.stringify({ error: 'Payout not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Verify payout is in pending status
    if (payout.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Payout is already in ${payout.status} status` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Verify seller has a connected Stripe account
    const stripeAccountId = payout.profiles?.stripe_account_id;
    if (!stripeAccountId) {
      return new Response(
        JSON.stringify({ error: 'Seller does not have a connected Stripe account' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Calculate the amount in cents (Stripe uses cents)
    const amountInCents = Math.round(payout.commission_amount * 100);
    
    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd', // Update this if you support multiple currencies
      destination: stripeAccountId,
      metadata: {
        payout_id: payoutId,
        month_year: payout.month_year,
        seller_id: payout.seller_id
      },
      description: `Payout for ${payout.month_year} - ${payout.total_downloads} downloads`
    });

    console.log(`Created Stripe transfer ${transfer.id} for payout ${payoutId}`);

    // Update payout record
    const { error: updateError } = await supabase
      .from('payouts')
      .update({
        status: 'processing',
        stripe_transfer_id: transfer.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', payoutId);

    if (updateError) {
      console.error('Error updating payout record:', updateError);
      
      // Try to cancel the transfer if there was an error updating the payout record
      try {
        await stripe.transfers.cancel(transfer.id);
      } catch (cancelError) {
        console.error('Failed to cancel transfer after database error:', cancelError);
      }

      return new Response(
        JSON.stringify({ error: 'Failed to update payout record' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Create notification for seller
    try {
      await supabase.from('notifications').insert([
        {
          user_id: payout.seller_id,
          type: 'payout_initiated',
          message: `Your payout of $${payout.commission_amount} for ${payout.month_year} has been initiated`,
          link: '/payouts'
        }
      ]);
    } catch (notificationError) {
      console.warn('Failed to create notification:', notificationError);
      // Don't fail the request if notification creation fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout processing initiated successfully',
        transfer_id: transfer.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error: any) {
    console.error('Error processing payout:', error);
    
    // Handle specific Stripe errors
    if (error.type?.startsWith('Stripe')) {
      return new Response(
        JSON.stringify({ 
          error: `Stripe error: ${error.message || 'Unknown Stripe error'}` 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});