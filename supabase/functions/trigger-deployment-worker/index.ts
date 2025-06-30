// supabase/functions/trigger-deployment-worker/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { deployment_id } = await req.json();

    if (!deployment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: deployment_id' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get deployment info
    const { data: deployment, error: deploymentError } = await supabase
      .from('deployments')
      .select('*')
      .eq('id', deployment_id)
      .single();

    if (deploymentError || !deployment) {
      console.error('Error fetching deployment:', deploymentError);
      return new Response(
        JSON.stringify({ error: 'Deployment not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log(`Triggering Railway worker for deployment ID: ${deployment_id}`);

    // Get the Railway worker URL from environment variables
    const railwayWorkerUrl = Deno.env.get('RAILWAY_WORKER_URL');
    if (!railwayWorkerUrl) {
      console.error('RAILWAY_WORKER_URL environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Railway worker URL not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Call the Railway worker
    const workerResponse = await fetch(`${railwayWorkerUrl}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deployment_id: deployment_id,
      }),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error('Railway worker error response:', errorText);
      
      // Update deployment status to failed
      await supabase
        .from('deployments')
        .update({
          status: 'failed',
          error_message: `Railway worker error: ${errorText}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', deployment_id);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to trigger deployment worker',
          details: errorText
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Parse the worker response
    const workerData = await workerResponse.json();
    console.log('Railway worker response:', workerData);

    // Update deployment status to processing
    await supabase
      .from('deployments')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', deployment_id);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Deployment worker triggered successfully',
        deployment_id: deployment_id,
        worker_response: workerData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in trigger-deployment-worker function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});