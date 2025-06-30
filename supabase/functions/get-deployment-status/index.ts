// supabase/functions/get-deployment-status/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let deploymentId = '';
    
    // Get deployment_id from query parameters or request body
    if (req.method === 'GET') {
      const url = new URL(req.url);
      deploymentId = url.searchParams.get('id') || '';
    } else { // POST
      const requestData = await req.json();
      deploymentId = requestData.id || '';
    }

    if (!deploymentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: id' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get deployment status
    const { data, error } = await supabase
      .from('deployments')
      .select('id, status, netlify_site_url, netlify_site_id, error_message, github_repo_url, repo_name, repo_owner')
      .eq('id', deploymentId)
      .single();

    if (error) {
      console.error('Error fetching deployment:', error);
      return new Response(
        JSON.stringify({ error: 'Deployment not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    return new Response(
      JSON.stringify({
        id: data.id,
        status: data.status,
        netlify_site_url: data.netlify_site_url,
        netlify_site_id: data.netlify_site_id,
        github_repo_url: data.github_repo_url,
        repo_name: data.repo_name,
        repo_owner: data.repo_owner,
        error_message: data.error_message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in get-deployment-status function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});