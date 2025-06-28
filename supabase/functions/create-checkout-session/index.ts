import Stripe from 'stripe';

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

  try {
    const { plan_type, user_id, user_email } = await req.json();

    // Validate required fields
    if (!plan_type || !user_id || !user_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan_type, user_id, user_email' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Initialize Stripe with your secret key
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

    // Map your plan_type to Stripe Price IDs
    // IMPORTANT: Replace these with your actual Stripe Price IDs from your Stripe Dashboard
    let priceId: string;
    switch (plan_type) {
      case 'basic':
        priceId = 'price_1234567890_basic'; // Replace with your Basic plan Price ID
        break;
      case 'pro':
        priceId = 'price_1234567890_pro'; // Replace with your Pro plan Price ID
        break;
      case 'premium':
        priceId = 'price_1234567890_premium'; // Replace with your Premium plan Price ID
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Invalid plan type: ${plan_type}` }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
    }

    // Get the origin from the request headers for redirect URLs
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user_email, // Pre-fill customer email
      client_reference_id: user_id, // Link to your user in Supabase
      metadata: {
        user_id: user_id,
        plan_type: plan_type,
      },
      success_url: `${origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      payment_method_types: ['card'],
      subscription_data: {
        metadata: {
          user_id: user_id,
          plan_type: plan_type,
        },
      },
    });

    console.log(`Created checkout session ${session.id} for user ${user_id} with plan ${plan_type}`);

    return new Response(
      JSON.stringify({ 
        checkout_url: session.url,
        session_id: session.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    
    // Return a more specific error message based on the error type
    let errorMessage = 'An unexpected error occurred';
    if (error.type === 'StripeCardError') {
      errorMessage = 'Payment processing error';
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid payment request';
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