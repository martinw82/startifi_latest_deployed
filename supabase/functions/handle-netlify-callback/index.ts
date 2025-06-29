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
      .from('netlify_oauth_states')
      .select('user_id, deployment_id, github_repo_url, expires_at')
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

    const { user_id, deployment_id, github_repo_url } = stateData;

    // Exchange the code for an access token
    const netlifyClientId = Deno.env.get('NETLIFY_CLIENT_ID');
    const netlifyClientSecret = Deno.env.get('NETLIFY_CLIENT_SECRET');

    if (!netlifyClientId || !netlifyClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Netlify configuration error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Define the redirect_uri here, matching the one used in initiate-netlify-oauth
    const origin = req.headers.get('origin') || 'http://localhost:5173';
    const redirectUri = `${origin}/buyer-netlify-callback`;

    const tokenResponse = await fetch('https://api.netlify.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: netlifyClientId,
        client_secret: netlifyClientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri, // Added redirect_uri here
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to exchange code for token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Netlify' }),
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
        JSON.stringify({ error: 'No access token received from Netlify' }),
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

    // Get Netlify user info
    const userResponse = await fetch('https://api.netlify.com/api/v1/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch Netlify user data:', await userResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Netlify user data' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const userData = await userResponse.json();
    const netlifySiteName = userData.slug || userData.full_name || `mvp-${user_id.substring(0, 8)}`;

    // Store the tokens securely
    // First, check if a token for this user and provider already exists
    const { data: existingToken, error: checkError } = await supabase
      .from('user_oauth_tokens')
      .select('id')
      .eq('user_id', user_id)
      .eq('provider', 'netlify')
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
          provider: 'netlify',
          access_token: accessToken,
          refresh_token: refreshToken || null,
          expires_at: expiresAt,
        });
      
      tokenError = error;
    }

    if (tokenError) {
      console.error('Error storing OAuth token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to store Netlify authentication' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Update user profile with Netlify site name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        netlify_site_name: netlifySiteName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (profileError) {
      console.error('Error updating user profile with Netlify site name:', profileError);
      // Non-critical error, continue anyway
    }

    // Clean up the used state
    await supabase
      .from('netlify_oauth_states')
      .delete()
      .eq('state', state);

    // Now that we have the Netlify token, create the site
    // Invoke the create-netlify-site-from-github function
    const { data: createSiteData, error: createSiteError } = await supabase.functions.invoke(
      'create-netlify-site-from-github',
      {
        body: {
          user_id: user_id,
          deployment_id: deployment_id,
          github_repo_url: github_repo_url,
        },
      }
    );

    if (createSiteError) {
      console.error('Error invoking create-netlify-site-from-github:', createSiteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create Netlify site' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Return success with relevant information
    return new Response(
      JSON.stringify({
        success: true,
        netlify_site_name: netlifySiteName,
        deployment_id: deployment_id,
        site_url: createSiteData?.site_url || null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in handle-netlify-callback function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
