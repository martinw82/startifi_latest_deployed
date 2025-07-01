// supabase/functions/create-buyer-repo-and-push-mvp/index.ts
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

async function updateDeploymentStatus(supabase: SupabaseClient, deploymentId: string, status: string, errorMessage: string | null) {
  const updateData: { status: string; updated_at: string; error_message?: string } = {
    status,
    updated_at: new Date().toISOString()
  };
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }
  console.log(`Updating deployment ${deploymentId} to status: ${status}, error: ${errorMessage || 'null'}`);
  try {
    const { error } = await supabase.from('deployments').update(updateData).eq('id', deploymentId);
    if (error) {
        console.error(`Failed to update deployment status for ${deploymentId} to ${status}:`, error);
    }
  } catch (error) {
    console.error(`Catastrophic error updating deployment status for ${deploymentId} to ${status}:`, error);
  }
}

Deno.serve(async (req: Request) => {
  console.log('create-buyer-repo-and-push-mvp: Function invoked.');
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405
    });
  }

  let deployment_id_outer: string | null = null;

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const requestBody = await req.json();
    console.log('create-buyer-repo-and-push-mvp: Received request body:', JSON.stringify(requestBody));
    const { user_id, mvp_id, deployment_id, repo_name: requestedRepoName, create_only = false } = requestBody;
    
    deployment_id_outer = deployment_id;

    if (!user_id || !deployment_id || !requestedRepoName) {
      console.error('create-buyer-repo-and-push-mvp: Missing required fields.');
      // Note: deployment_id might be null here, so can't update status if it's one of the missing fields.
      return new Response(JSON.stringify({ error: 'Missing required fields: user_id, deployment_id, repo_name' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
      });
    }

    await updateDeploymentStatus(supabase, deployment_id, 'creating_repo', null);
    
    if (mvp_id && !create_only) {
      // MVP access verification
      console.log(`create-buyer-repo-and-push-mvp: Verifying MVP access for user ${user_id} and MVP ${mvp_id}.`);
      const { data: downloadData, error: downloadError } = await supabase.from('downloads').select('id').eq('user_id', user_id).eq('mvp_id', mvp_id).maybeSingle();
      if (downloadError) {
        console.error('create-buyer-repo-and-push-mvp: Error checking download records:', downloadError);
        await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to verify MVP access');
        return new Response(JSON.stringify({ error: 'Failed to verify MVP access' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      }
      if (!downloadData) {
        console.warn('create-buyer-repo-and-push-mvp: User has not purchased/downloaded this MVP.');
        await updateDeploymentStatus(supabase, deployment_id, 'failed', 'User has not purchased/downloaded this MVP');
        return new Response(JSON.stringify({ error: 'User has not purchased/downloaded this MVP' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
      }
      console.log('create-buyer-repo-and-push-mvp: MVP access verified.');
    }

    // Fetch GitHub token
    console.log(`create-buyer-repo-and-push-mvp: Fetching GitHub token for user ${user_id}.`);
    const { data: tokenData, error: tokenError } = await supabase.from('user_oauth_tokens').select('access_token').eq('user_id', user_id).eq('provider', 'github').maybeSingle();
    if (tokenError || !tokenData?.access_token) {
      console.error('create-buyer-repo-and-push-mvp: Error fetching GitHub token:', tokenError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'GitHub authentication not found');
      return new Response(JSON.stringify({ error: 'GitHub authentication not found. Please connect your GitHub account.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
    const githubToken = tokenData.access_token;
    console.log('create-buyer-repo-and-push-mvp: GitHub token fetched.');

    // Fetch GitHub username
    console.log(`create-buyer-repo-and-push-mvp: Fetching GitHub username for user ${user_id}.`);
    const { data: userData, error: userError } = await supabase.from('profiles').select('github_username').eq('id', user_id).single();
    if (userError || !userData?.github_username) {
      console.error('create-buyer-repo-and-push-mvp: Error fetching GitHub username:', userError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'GitHub username not found');
      return new Response(JSON.stringify({ error: 'GitHub username not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
    const githubUsername = userData.github_username;
    console.log(`create-buyer-repo-and-push-mvp: GitHub username ${githubUsername} fetched.`);
    
    const sanitizedRepoName = requestedRepoName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^[^a-zA-Z0-9]/, 'r').toLowerCase();
    
    // Fetch MVP details (title for description, storage_path for worker)
    // The 'mvps' table needs a 'storage_path' column that stores the path to the MVP file in Supabase storage.
    console.log(`create-buyer-repo-and-push-mvp: Fetching MVP data (title, storage_path) for MVP ID: ${mvp_id}.`);
    const { data: mvp, error: mvpError } = await supabase.from('mvps').select('title, storage_path').eq('id', mvp_id).single();
    if (mvpError || !mvp) {
      console.error('create-buyer-repo-and-push-mvp: Error fetching MVP details:', mvpError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to fetch MVP data');
      return new Response(JSON.stringify({ error: 'Failed to fetch MVP data' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }
    if (!mvp.storage_path) { // storage_path is crucial for the worker
      console.error('create-buyer-repo-and-push-mvp: MVP storage_path is missing from fetched MVP data.');
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'MVP configuration error: storage_path missing.');
      return new Response(JSON.stringify({ error: 'MVP configuration error: storage_path missing.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }
    console.log('create-buyer-repo-and-push-mvp: MVP data fetched.');      

    // Create GitHub repository
    console.log(`create-buyer-repo-and-push-mvp: Attempting to create GitHub repository: ${githubUsername}/${sanitizedRepoName}`);
    const createRepoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: sanitizedRepoName, description: `${mvp.title} - Deployed from MVP Library`, private: true, auto_init: true }) // auto_init creates repo with a README
    });

    if (!createRepoResponse.ok) {
      const errorData = await createRepoResponse.json();
      console.error('create-buyer-repo-and-push-mvp: Failed to create GitHub repository:', errorData);
      const errorMessage = errorData.errors?.[0]?.message?.includes('name already exists')
        ? `Repository name "${sanitizedRepoName}" already exists on your GitHub account. Please choose a different name.`
        : `GitHub error: ${errorData.errors?.[0]?.message || 'Failed to create repository'}`;
      await updateDeploymentStatus(supabase, deployment_id, 'failed', errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 });
    }
    const repoData = await createRepoResponse.json();
    const repoUrl = repoData.html_url; // HTML URL to the repo
    const gitUrl = repoData.clone_url; // HTTPS clone URL, potentially useful for worker
    console.log(`create-buyer-repo-and-push-mvp: Successfully created GitHub repository: ${repoUrl}`);

    // Update deployment record with GitHub repo details and MVP storage_path for the worker
    console.log(`create-buyer-repo-and-push-mvp: Updating deployment record ${deployment_id} with GitHub details and MVP storage_path.`);
    const { error: updateDeployError } = await supabase.from('deployments').update({
      github_repo_url: repoUrl,
      git_clone_url: gitUrl,   // Store the clone URL as well
      repo_owner: githubUsername,
      repo_name: sanitizedRepoName,
      storage_path: mvp.storage_path, // This is the path to the MVP zip in Supabase storage
      mvp_id: mvp_id, 
      updated_at: new Date().toISOString()
    }).eq('id', deployment_id);

    if (updateDeployError) {
        console.error('create-buyer-repo-and-push-mvp: Failed to update deployment record with repo details:', updateDeployError);
        await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to update deployment record with repo details');
        return new Response(JSON.stringify({ error: 'Failed to update deployment record' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }
    console.log('create-buyer-repo-and-push-mvp: Deployment record updated successfully.');

    if (create_only) {
      console.log('create-buyer-repo-and-push-mvp: create_only flag is true. Stopping after repo creation.');
      await updateDeploymentStatus(supabase, deployment_id, 'repo_created', null);
      return new Response(JSON.stringify({ 
        success: true, 
        github_repo_url: repoUrl, 
        message: 'GitHub repository created successfully (create_only mode).' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }

    // If not create_only, proceed to invoke worker
    await updateDeploymentStatus(supabase, deployment_id, 'invoking_worker', null);
    console.log(`create-buyer-repo-and-push-mvp: Invoking trigger-deployment-worker for deployment_id: ${deployment_id}`);

    const { error: triggerWorkerError, data: triggerWorkerData } = await supabase.functions.invoke('trigger-deployment-worker', {
      body: { deployment_id: deployment_id }, // trigger-deployment-worker expects { deployment_id: "..." }
    });

    if (triggerWorkerError) {
      console.error('create-buyer-repo-and-push-mvp: Error invoking trigger-deployment-worker:', triggerWorkerError);
      await updateDeploymentStatus(supabase, deployment_id, 'worker_trigger_failed', `Worker invocation error: ${triggerWorkerError.message}`);
      return new Response(JSON.stringify({ error: 'Failed to invoke deployment worker', details: triggerWorkerError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      });
    }

    console.log('create-buyer-repo-and-push-mvp: trigger-deployment-worker invoked successfully.', triggerWorkerData);
    // The status will now be updated by trigger-deployment-worker (e.g., to 'processing') or by the worker itself.
    
    return new Response(JSON.stringify({
      success: true,
      github_repo_url: repoUrl,
      git_url: gitUrl, // Provide clone URL as it's useful for the worker
      message: 'GitHub repository created and deployment worker invoked.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    });

  } catch (error) {
    console.error('create-buyer-repo-and-push-mvp: Unhandled error in main try-catch:', error);
    if (deployment_id_outer) { // Use the deployment_id from the outer scope
        // Re-initialize supabase client for the catch block if needed, or ensure it's in scope.
        // For safety, re-init, though it might be overkill if supabase var from try is accessible.
        const supabaseForCatch = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        await updateDeploymentStatus(supabaseForCatch, deployment_id_outer, 'failed', `Unhandled error: ${error.message}`);
    }
    return new Response(JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});
