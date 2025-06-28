import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import jwt from 'npm:jsonwebtoken@9.0.2';

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
    const { installation_id } = await req.json();

    if (!installation_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: installation_id' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const githubAppId = Deno.env.get('GITHUB_APP_ID');
    const githubAppPrivateKey = Deno.env.get('GITHUB_APP_PRIVATE_KEY');

    if (!githubAppId || !githubAppPrivateKey) {
      console.error('GitHub App credentials not set');
      return new Response(
        JSON.stringify({ error: 'GitHub App configuration error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Generate JWT
    const payload = {
      iat: Math.floor(Date.now() / 1000) - 60, // Issued at time, 60 seconds in the past
      exp: Math.floor(Date.now() / 1000) + (10 * 60), // JWT expiration time (10 minutes maximum)
      iss: githubAppId, // GitHub App's ID
    };

    const token = jwt.sign(payload, githubAppPrivateKey, { algorithm: 'RS256' });

    // Request installation access token from GitHub
    const githubTokenResponse = await fetch(
      `https://api.github.com/app/installations/${installation_id}/access_tokens`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MVP-Library-Platform', // Replace with your app's name
        },
      }
    );

    if (!githubTokenResponse.ok) {
      const errorText = await githubTokenResponse.text();
      console.error('Failed to get installation access token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get GitHub installation token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: githubTokenResponse.status,
        }
      );
    }

    const githubTokenData = await githubTokenResponse.json();
    const installationAccessToken = githubTokenData.token;

    if (!installationAccessToken) {
      console.error('No installation access token received from GitHub:', githubTokenData);
      return new Response(
        JSON.stringify({ error: 'No installation access token received' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, token: installationAccessToken }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in get-github-app-token function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
