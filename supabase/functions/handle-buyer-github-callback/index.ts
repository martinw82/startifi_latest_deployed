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

    const { code, state } = await req.json();

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: code, state' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Verify the state parameter to prevent CSRF attacks
    const { data: stateData, error: stateError } = await supabase
      .from('github_oauth_states')
      .select('user_id, mvp_id, expires_at')
      .eq('state', state)
      .single();

    if (stateError || !stateData) {
      console.error('Invalid or expired state parameter:', stateError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired state parameter' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Check if the state has expired
    if (new Date(stateData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'OAuth state has expired. Please try again.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { user_id, mvp_id } = stateData;

    // Exchange the code for an access token
    const githubClientId = Deno.env.get('BUYER_GITHUB_CLIENT_ID');
    const githubClientSecret = Deno.env.get('BUYER_GITHUB_CLIENT_SECRET');

    if (!githubClientId || !githubClientSecret) {
      return new Response(
        JSON.stringify({ error: 'GitHub App configuration error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to exchange code for token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with GitHub' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: tokenResponse.status,
        }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token received from GitHub' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Calculate token expiration date (if provided)
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    }

    // Get GitHub user info to store username
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch GitHub user data:', await userResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch GitHub user data' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const userData = await userResponse.json();
    const githubUsername = userData.login;

    // Store the tokens and username securely
    // First, check if a token for this user and provider already exists
    const { data: existingToken, error: checkError } = await supabase
      .from('user_oauth_tokens')
      .select('id')
      .eq('user_id', user_id)
      .eq('provider', 'github')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing token:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check for existing token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    let tokenError;
    if (existingToken) {
      // Update existing token
      const { error } = await supabase
        .from('user_oauth_tokens')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken || null,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingToken.id);
      
      tokenError = error;
    } else {
      // Insert new token
      const { error } = await supabase
        .from('user_oauth_tokens')
        .insert({
          user_id: user_id,
          provider: 'github',
          access_token: accessToken,
          refresh_token: refreshToken || null,
          expires_at: expiresAt,
        });
      
      tokenError = error;
    }

    if (tokenError) {
      console.error('Error storing OAuth token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to store GitHub authentication' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Update user profile with GitHub username
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        github_username: githubUsername,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (profileError) {
      console.error('Error updating user profile with GitHub username:', profileError);
      // Non-critical error, continue anyway
    }

    // Clean up the used state
    await supabase
      .from('github_oauth_states')
      .delete()
      .eq('state', state);

    // Return success with relevant information
    return new Response(
      JSON.stringify({
        success: true,
        github_username: githubUsername,
        mvp_id: mvp_id || null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in handle-buyer-github-callback function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});