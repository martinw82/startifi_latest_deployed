import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { v4 } from 'npm:uuid';

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

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const githubAppClientId = Deno.env.get('GITHUB_APP_CLIENT_ID');
    if (!githubAppClientId) {
      console.error('GITHUB_APP_CLIENT_ID environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'GitHub App configuration error: Client ID missing' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Generate a unique state parameter to prevent CSRF attacks
    const state = v4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // State valid for 5 minutes

    // Store the state and user_id in the database
    // IMPORTANT: You need to create a 'github_oauth_states' table in your Supabase database
    // with columns: state (TEXT, PRIMARY KEY), user_id (UUID), expires_at (TIMESTAMPTZ), created_at (TIMESTAMPTZ)
    const { error: insertError } = await supabase
      .from('github_oauth_states')
      .insert([
        {
          user_id: user_id,
          state: state,
          expires_at: expiresAt,
        },
      ]);

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
    const origin = req.headers.get('origin') || 'http://localhost:5173'; // Fallback for local development
    const redirectUri = `${origin}/github-app-callback`;
    const scope = 'repo'; // Request full repository access

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubAppClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

    console.log(`Generated GitHub OAuth URL for user ${user_id}: ${githubAuthUrl}`);

    return new Response(
      JSON.stringify({ github_auth_url: githubAuthUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in initiate-github-oauth function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
