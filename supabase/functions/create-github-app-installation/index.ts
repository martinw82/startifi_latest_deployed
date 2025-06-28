// supabase/functions/create-github-app-installation/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 405
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { code, installation_id, state } = await req.json();
    console.log("create-github-app-installation: Function started.");
    console.log("create-github-app-installation: Received code:", code);
    console.log("create-github-app-installation: Received installation_id:", installation_id);
    console.log("create-github-app-installation: Received state (userId):", state); // Changed log to userId
    if (!code || !installation_id || !state) {
      console.error("create-github-app-installation: Missing required fields.");
      return new Response(JSON.stringify({
        error: 'Missing required fields: code, installation_id, state (userId)'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    const userId = state; // Changed from mvpId to userId
    const githubAppClientId = Deno.env.get('GITHUB_APP_CLIENT_ID');
    const githubAppClientSecret = Deno.env.get('GITHUB_APP_CLIENT_SECRET');
    if (!githubAppClientId || !githubAppClientSecret) {
      console.error('create-github-app-installation: GitHub App credentials not set.');
      return new Response(JSON.stringify({
        error: 'GitHub App configuration error'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    // Exchange the temporary code for an access token
    console.log("create-github-app-installation: Exchanging code for access token with GitHub...");
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: githubAppClientId,
        client_secret: githubAppClientSecret,
        code: code
      })
    });
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('create-github-app-installation: Failed to exchange code for token:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to authenticate with GitHub'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: tokenResponse.status
      });
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log("create-github-app-installation: Received token data from GitHub:", tokenData);
    console.log("create-github-app-installation: Extracted access token (first 5 chars):", accessToken ? accessToken.substring(0, 5) : 'N/A');
    if (!accessToken) {
      console.error('create-github-app-installation: No access token received from GitHub.');
      return new Response(JSON.stringify({
        error: 'Failed to get access token from GitHub'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    // Update the profiles table with the GitHub App installation ID
    console.log(`create-github-app-installation: Attempting to update profile ${userId} with installation ID ${installation_id}`);
    const { error: updateError } = await supabase.from('profiles') // Changed from mvps to profiles
    .update({
      github_app_installation_id: installation_id,
      updated_at: new Date().toISOString()
    }).eq('id', userId); // Changed from mvpId to userId
    if (updateError) {
      console.error('create-github-app-installation: Error updating profile with GitHub App installation ID:', updateError); // Changed log
      console.error('create-github-app-installation: Supabase update error details:', updateError.message, updateError.details, updateError.hint);
      return new Response(JSON.stringify({
        error: 'Failed to save GitHub App installation ID to profile'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    console.log(`create-github-app-installation: Successfully updated profile ${userId} with GitHub App installation ${installation_id}`); // Changed log
    return new Response(JSON.stringify({
      success: true,
      message: 'GitHub App installed and linked successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('create-github-app-installation: An unexpected error occurred in the function:', error);
    console.error('create-github-app-installation: Error stack:', error.stack);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
