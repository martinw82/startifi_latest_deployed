// supabase/functions/unsubscribe-from-newsletter/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper function to generate MD5 hash (required by Mailchimp for member IDs)
async function md5(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hexHash;
}

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
      .select('name')
      .eq('id', newsletter_type_id)
      .single();

    if (newsletterTypeError || !newsletterType) {
      console.warn('Newsletter type not found for unsubscribe, proceeding anyway:', newsletterTypeError);
      // Continue even if not found, as we might still want to update our internal record
    }

    // 3. Integrate with Mailchimp
    const mailchimpApiKey = Deno.env.get('MAILCHIMP_API_KEY');
    const mailchimpAudienceId = Deno.env.get('MAILCHIMP_AUDIENCE_ID');
    const mailchimpApiServer = Deno.env.get('MAILCHIMP_API_SERVER'); // e.g., 'us1', 'us2'

    if (!mailchimpApiKey || !mailchimpAudienceId || !mailchimpApiServer) {
      console.error('Mailchimp API credentials not set');
      return new Response(
        JSON.stringify({ error: 'Mailchimp configuration error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const subscriberHash = await md5(email.toLowerCase());
    const mailchimpUrl = `https://${mailchimpApiServer}.api.mailchimp.com/3.0/lists/${mailchimpAudienceId}/members/${subscriberHash}`;

    const mailchimpResponse = await fetch(mailchimpUrl, {
      method: 'PATCH', // Use PATCH to update a member's status
      headers: {
        'Authorization': `Basic ${btoa(`anystring:${mailchimpApiKey}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'unsubscribed',
      }),
    });

    if (!mailchimpResponse.ok) {
      const errorData = await mailchimpResponse.json();
      console.error('Error unsubscribing from Mailchimp:', errorData);
      // Decide if you want to fail the entire request or just log the ESP error
      return new Response(
        JSON.stringify({ error: `Failed to unsubscribe with Mailchimp: ${errorData.detail || 'Unknown error'}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    console.log(`Successfully unsubscribed ${email} from Mailchimp audience.`);

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