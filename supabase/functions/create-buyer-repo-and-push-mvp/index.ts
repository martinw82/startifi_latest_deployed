// supabase/functions/create-buyer-repo-and-push-mvp/index.ts
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

    const { user_id, mvp_id, deployment_id, repo_name } = await req.json();

    console.log('create-buyer-repo-and-push-mvp: Received parameters:', { user_id, mvp_id, deployment_id, repo_name });

    if (!user_id || !mvp_id || !deployment_id || !repo_name) {
      const missingFields = [];
      if (!user_id) missingFields.push('user_id');
      if (!mvp_id) missingFields.push('mvp_id');
      if (!deployment_id) missingFields.push('deployment_id');
      if (!repo_name) missingFields.push('repo_name');
      
      console.error('create-buyer-repo-and-push-mvp: Missing required fields:', missingFields.join(', '));
      await updateDeploymentStatus(supabase, deployment_id, 'failed', `Missing required fields: ${missingFields.join(', ')}`);
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missingFields.join(', ')}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Update deployment status to 'creating_repo'
    await updateDeploymentStatus(supabase, deployment_id, 'creating_repo', null);

    // 1. Fetch the user's GitHub access token
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('access_token')
      .eq('user_id', user_id)
      .eq('provider', 'github')
      .maybeSingle();

    if (tokenError || !tokenData?.access_token) {
      console.error('create-buyer-repo-and-push-mvp: GitHub token not found for user:', tokenError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'GitHub token not found for user.');
      return new Response(
        JSON.stringify({ error: 'GitHub token not found for user. Please connect your GitHub account in settings.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const githubAccessToken = tokenData.access_token;

    // 2. Create a new GitHub repository
    console.log(`create-buyer-repo-and-push-mvp: Creating GitHub repository "${repo_name}" for user ${user_id}...`);
    const createRepoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repo_name,
        private: true, // Or false, depending on your policy
        auto_init: false, // We will push content later
      }),
    });

    if (!createRepoResponse.ok) {
      const errorText = await createRepoResponse.text();
      console.error('create-buyer-repo-and-push-mvp: Failed to create GitHub repository:', errorText);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', `Failed to create GitHub repository: ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Failed to create GitHub repository: ${errorText}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: createRepoResponse.status,
        }
      );
    }

    const repoData = await createRepoResponse.json();
    const githubRepoUrl = repoData.html_url;
    const repoOwner = repoData.owner.login; // Get the actual owner (user's GitHub username)

    console.log(`create-buyer-repo-and-push-mvp: GitHub repository created: ${githubRepoUrl}`);

    // --- START MODIFICATION ---

    // Fetch MVP details to determine storage_path
    const { data: mvpDetails, error: mvpError } = await supabase
      .from('mvps')
      .select('slug, version_number, last_synced_github_commit_sha, previous_ipfs_hash')
      .eq('id', mvp_id)
      .single();

    if (mvpError || !mvpDetails) {
      console.error('create-buyer-repo-and-push-mvp: Error fetching MVP details:', mvpError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to fetch MVP details for storage path.');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch MVP details for storage path' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Determine the storage path for the MVP file
    const storagePath = getMvpStoragePath(mvpDetails);
    if (!storagePath) {
      console.error('create-buyer-repo-and-push-mvp: Could not determine storage path for MVP.');
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Could not determine storage path for MVP file.');
      return new Response(
        JSON.stringify({ error: 'Could not determine storage path for MVP file' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    console.log(`create-buyer-repo-and-push-mvp: Determined storage path: ${storagePath}`);

    // 3. Update the deployment record with the new GitHub repository URL, owner, and storage_path
    const { error: updateDeploymentError } = await supabase
      .from('deployments')
      .update({
        github_repo_url: githubRepoUrl,
        repo_owner: repoOwner,
        repo_name: repo_name,
        storage_path: storagePath, // Set the storage_path here
        status: 'repo_created', // New status
        updated_at: new Date().toISOString(),
      })
      .eq('id', deployment_id);

    if (updateDeploymentError) {
      console.error('create-buyer-repo-and-push-mvp: Error updating deployment record:', updateDeploymentError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to update deployment record with GitHub repo details and storage path.');
      return new Response(
        JSON.stringify({ error: 'Failed to update deployment record with GitHub repository details and storage path' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // --- END MODIFICATION ---

    // 4. Trigger the external worker to push the MVP files to the new repository
    console.log(`create-buyer-repo-and-push-mvp: Triggering external worker for deployment ${deployment_id}...`);
    const { data: workerTriggerData, error: workerTriggerError } = await supabase.functions.invoke('trigger-deployment-worker', {
      body: { deployment_id: deployment_id },
    });

    if (workerTriggerError) {
      console.error('create-buyer-repo-and-push-mvp: Error triggering deployment worker:', workerTriggerError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', `Failed to trigger deployment worker: ${workerTriggerError.message}`);
      return new Response(
        JSON.stringify({ error: `Failed to trigger deployment worker: ${workerTriggerError.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('create-buyer-repo-and-push-mvp: Deployment worker triggered successfully:', workerTriggerData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'GitHub repository created and worker triggered successfully.',
        github_repo_url: githubRepoUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('create-buyer-repo-and-push-mvp: An unexpected error occurred in the function:', error);
    // Ensure deployment_id is defined before attempting to update status
    const requestBody = req.body ? await req.json().catch(() => ({})) : {};
    const currentDeploymentId = requestBody.deployment_id || 'unknown';
    await updateDeploymentStatus(supabase, currentDeploymentId, 'failed', error.message || 'An unexpected error occurred during repository creation.');
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to update deployment status
async function updateDeploymentStatus(supabase: any, deploymentId: string, status: string, errorMessage: string | null) {
  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  try {
    const { error } = await supabase
      .from('deployments')
      .update(updateData)
      .eq('id', deploymentId);
    if (error) {
      console.error(`Failed to update deployment ${deploymentId} status to ${status}:`, error);
    } else {
      console.log(`Deployment ${deploymentId} status updated to: ${status}`);
    }
  } catch (e) {
    console.error(`Catastrophic error during Supabase status update for ${deploymentId}:`, e);
  }
}

// Helper function to determine the MVP storage path (replicated from frontend)
function getMvpStoragePath(mvp: { slug: string; version_number: string; last_synced_github_commit_sha?: string | null; previous_ipfs_hash?: string | null }): string | null {
  const slug = mvp.slug;
  // Prioritize GitHub-synced path if last_synced_github_commit_sha is present
  if (mvp.last_synced_github_commit_sha) {
    // The webhook function adds .zip extension
    return `mvps/${slug}/versions/github-${mvp.last_synced_github_commit_sha}/source.zip`;
  }
  // For initial manual uploads (version 1.0.0 and no previous IPFS hash)
  // This heuristic assumes '1.0.0' is always the initial version and subsequent manual versions increment.
  // If a manual version 1.0.0 was uploaded after a GitHub sync, this might be incorrect.
  // However, given the current upload logic, this should hold.
  if (mvp.version_number === '1.0.0' && !mvp.previous_ipfs_hash) {
    return `mvps/${slug}/source`;
  }
  // For subsequent manual version uploads
  return `mvps/${slug}/versions/${mvp.version_number}/source`;
}
