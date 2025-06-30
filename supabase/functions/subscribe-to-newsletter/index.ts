// supabase/functions/subscribe-to-newsletter/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, newsletter_type_id, email, source } = await req.json();

    // 1. Validate input
    if (!user_id || !newsletter_type_id || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, newsletter_type_id, email' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 2. Fetch newsletter_type details from the database to get esp_list_id (if applicable)
    const { data: newsletterType, error: newsletterTypeError } = await supabase
      .from('newsletter_types') // Assuming you have a 'newsletter_types' table
      .select('name, esp_list_id')
      .eq('id', newsletter_type_id)
      .single();

    if (newsletterTypeError || !newsletterType) {
      console.error('Error fetching newsletter type:', newsletterTypeError);
      return new Response(
        JSON.stringify({ error: 'Newsletter type not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // 3. Integrate with Email Service Provider (ESP) - Placeholder
    // In a real application, you would use the ESP_API_KEY and newsletterType.esp_list_id
    // to add the user's email to your mailing list.
    // Example (using a hypothetical ESP API):
    /*
    const espApiKey = Deno.env.get('ESP_API_KEY');
    const espResponse = await fetch(`https://api.example-esp.com/lists/${newsletterType.esp_list_id}/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${espApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed', // or 'pending' if double opt-in
      }),
    });

    if (!espResponse.ok) {
      const errorData = await espResponse.json();
      console.error('Error adding subscriber to ESP:', errorData);
      return new Response(
        JSON.stringify({ error: `Failed to subscribe with ESP: ${errorData.detail || 'Unknown error'}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    */
    console.log(`[ESP Integration Placeholder] Subscribing ${email} to ${newsletterType.name} (List ID: ${newsletterType.esp_list_id})`);


    // 4. Insert/update a record in user_newsletter_subscriptions table
    const { data, error } = await supabase
      .from('user_newsletter_subscriptions') // Assuming you have a 'user_newsletter_subscriptions' table
      .upsert({
        user_id: user_id,
        newsletter_type_id: newsletter_type_id,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null, // Ensure it's active
        status: 'active',
        source: source || 'unknown',
        last_modified_at: new Date().toISOString(),
      }, {
        onConflict: ['user_id', 'newsletter_type_id'], // Update if already exists
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Error storing subscription in database:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save subscription to database' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully subscribed to ${newsletterType.name}!`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in subscribe-to-newsletter function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});