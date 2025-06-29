// supabase/functions/initiate-netlify-oauth/index.ts

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

    const { user_id, github_repo_url, deployment_id } = await req.json();

    if (!user_id || !github_repo_url || !deployment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, github_repo_url, deployment_id' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Verify the deployment record exists and belongs to this user
    const { data: deploymentData, error: deploymentError } = await supabase
      .from('deployments')
      .select('*')
      .eq('id', deployment_id)
      .eq('user_id', user_id)
      .single();

    if (deploymentError || !deploymentData) {
      console.error('Error verifying deployment record:', deploymentError);
      return new Response(
        JSON.stringify({ error: 'Invalid deployment ID or unauthorized access' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    const netlifyClientId = Deno.env.get('NETLIFY_CLIENT_ID');
    if (!netlifyClientId) {
      console.error('NETLIFY_CLIENT_ID environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'Netlify configuration error: Client ID missing' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Generate a unique state parameter to prevent CSRF attacks
    const state = v4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // State valid for 5 minutes

    // Store the state, user_id, and deployment_id in the database
    const { error: insertError } = await supabase
      .from('netlify_oauth_states')
      .insert([
        {
          user_id: user_id,
          state: state,
          deployment_id: deployment_id,
          github_repo_url: github_repo_url,
          expires_at: expiresAt,
        },
      ]);

    if (insertError) {
      console.error('Error storing Netlify OAuth state:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to initiate Netlify OAuth process' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Construct the Netlify OAuth authorization URL
    const origin = req.headers.get('origin') || 'http://localhost:5173';
    const redirectUri = `${origin}/buyer-netlify-callback`;
    
    // Added 'scope=write:sites' to request necessary permissions
    const netlifyAuthUrl = `https://app.netlify.com/authorize?client_id=${netlifyClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&response_type=code`;

    console.log(`Generated Netlify OAuth URL for user ${user_id}: ${netlifyAuthUrl}`);

    // Update deployment status
    await supabase
      .from('deployments')
      .update({
        status: 'initializing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deployment_id);

    return new Response(
      JSON.stringify({ netlify_auth_url: netlifyAuthUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in initiate-netlify-oauth function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
