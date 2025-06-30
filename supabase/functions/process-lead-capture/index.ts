// supabase/functions/process-lead-capture/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js';

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

    const { email, source, agreed_to_terms, timestamp } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: email' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    // Check if the newsletter_subscribers table exists
    // If not, create it
    const { error: tableCheckError } = await supabase.rpc('check_table_exists', {
      table_name: 'newsletter_subscribers'
    });
    
    if (tableCheckError) {
      // Table doesn't exist, create it
      const { error: createTableError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email TEXT UNIQUE NOT NULL,
          source TEXT,
          agreed_to_terms BOOLEAN NOT NULL,
          subscribed_at TIMESTAMPTZ DEFAULT NOW(),
          last_modified_at TIMESTAMPTZ DEFAULT NOW(),
          unsubscribed_at TIMESTAMPTZ,
          categories TEXT[] DEFAULT '{updates,marketing}'
        );
        
        -- Enable Row Level Security
        ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for admin access
        CREATE POLICY "Admins can manage all subscribers" ON newsletter_subscribers
        USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'both')));
      `);
      
      if (createTableError) {
        console.error('Error creating newsletter_subscribers table:', createTableError);
        return new Response(
          JSON.stringify({ error: 'Failed to set up newsletter system' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // Insert or update the subscriber
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .upsert({
        email,
        source: source || 'lead_modal',
        agreed_to_terms: agreed_to_terms || false,
        subscribed_at: timestamp || new Date().toISOString(),
        last_modified_at: new Date().toISOString(),
        unsubscribed_at: null, // Reset if they're resubscribing
      }, {
        onConflict: 'email',
        ignoreDuplicates: false, // Update if exists
      });

    if (error) {
      console.error('Error storing lead:', error);
      
      // If the error is a duplicate entry, return a friendly message
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'You\'re already subscribed to our newsletter. Thank you for your interest!'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to process subscription' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Here you would typically add code to sync with your email service provider
    // For example, using the Mailchimp API, SendGrid, etc.
    // This would be done via fetch() calls to their API

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully subscribed to the newsletter!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in process-lead-capture function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});