// supabase/functions/unsubscribe-from-newsletter/index.ts
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

    const { user_id, newsletter_type_id, email } = await req.json();

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

    // 2. Fetch newsletter_type details from the database (optional, but good for logging/ESP integration)
    const { data: newsletterType, error: newsletterTypeError } = await supabase
      .from('newsletter_types') // Assuming you have a 'newsletter_types' table
      .select('name, esp_list_id')
      .eq('id', newsletter_type_id)
      .single();

    if (newsletterTypeError || !newsletterType) {
      console.warn('Newsletter type not found for unsubscribe, proceeding anyway:', newsletterTypeError);
      // Continue even if not found, as we might still want to update our internal record
    }

    // 3. Integrate with Email Service Provider (ESP) - Placeholder
    // In a real application, you would use the ESP_API_KEY and newsletterType.esp_list_id
    // to remove the user's email from your mailing list.
    // Example (using a hypothetical ESP API):
    /*
    const espApiKey = Deno.env.get('ESP_API_KEY');
    const espResponse = await fetch(`https://api.example-esp.com/lists/${newsletterType.esp_list_id}/members/${email}/status`, {
      method: 'PUT', // Or DELETE, depending on ESP API
      headers: {
        'Authorization': `Bearer ${espApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'unsubscribed',
      }),
    });

    if (!espResponse.ok) {
      const errorData = await espResponse.json();
      console.error('Error unsubscribing from ESP:', errorData);
      // Decide if you want to fail the entire request or just log the ESP error
    }
    */
    console.log(`[ESP Integration Placeholder] Unsubscribing ${email} from ${newsletterType?.name || 'unknown'} (List ID: ${newsletterType?.esp_list_id || 'unknown'})`);


    // 4. Update the record in user_newsletter_subscriptions table
    const { data, error } = await supabase
      .from('user_newsletter_subscriptions') // Assuming you have a 'user_newsletter_subscriptions' table
      .update({
        unsubscribed_at: new Date().toISOString(),
        status: 'inactive',
        last_modified_at: new Date().toISOString(),
      })
      .eq('user_id', user_id)
      .eq('newsletter_type_id', newsletter_type_id);

    if (error) {
      console.error('Error updating subscription status in database:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription status in database' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully unsubscribed from ${newsletterType?.name || 'the newsletter'}!`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in unsubscribe-from-newsletter function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
