// supabase/functions/initiate-buyer-github-oauth/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { v4 } from 'https://deno.land/std@0.224.0/uuid/mod.ts'; // Corrected import

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

    const { user_id, mvp_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Verify this user actually downloaded/purchased the MVP (if mvp_id provided)
    if (mvp_id) {
      const { data: downloadData, error: downloadError } = await supabase
        .from('downloads')
        .select('id')
        .eq('user_id', user_id)
        .eq('mvp_id', mvp_id)
        .maybeSingle();

      if (downloadError) {
        console.error('Error checking download records:', downloadError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify MVP access' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      if (!downloadData) {
        return new Response(
          JSON.stringify({ error: 'User has not purchased/downloaded this MVP' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }
    }

    const githubClientId = Deno.env.get('BUYER_GITHUB_CLIENT_ID');
    if (!githubClientId) {
      console.error('BUYER_GITHUB_CLIENT_ID environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'GitHub App configuration error: Client ID missing' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Generate a unique state parameter to prevent CSRF attacks
    const state = v4.generate(); // Use v4.generate() for UUID generation
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // State valid for 5 minutes

    // Store the state, user_id, and mvp_id (if provided) in the database
    const stateData = {
      user_id: user_id,
      state: state,
      expires_at: expiresAt,
    };
    
    if (mvp_id) {
      // @ts-ignore - Add mvp_id if provided
      stateData.mvp_id = mvp_id;
    }
    
    const { error: insertError } = await supabase
      .from('github_oauth_states')
      .insert([stateData]);

    if (insertError) {
      console.error('Error storing GitHub OAuth state:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to initiate GitHub OAuth process' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Construct the GitHub OAuth authorization URL
    const origin = req.headers.get('origin') || 'http://localhost:5173';
    const redirectUri = `${origin}/buyer-github-callback`;
    
    // Request scopes needed for repo creation and management
    const scope = 'repo'; // Full control of private repositories
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

    console.log(`Generated GitHub OAuth URL for user ${user_id}: ${githubAuthUrl}`);

    return new Response(
      JSON.stringify({ github_auth_url: githubAuthUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in initiate-buyer-github-oauth function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
