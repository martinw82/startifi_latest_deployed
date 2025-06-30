// supabase/functions/create-netlify-site-from-github/index.ts
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

    const { user_id, deployment_id, github_repo_url } = await req.json();

    if (!user_id || !deployment_id || !github_repo_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, deployment_id, github_repo_url' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Update deployment status to netlify_configuring_site
    // Use the helper function for consistency
    await updateDeploymentStatus(supabase, deployment_id, 'netlify_configuring_site', null);

    // Verify the deployment record exists, belongs to this user, and get mvp_id
    const { data: deploymentData, error: deploymentError } = await supabase
      .from('deployments')
      .select('mvp_id, user_id') // Only select what's needed
      .eq('id', deployment_id)
      .eq('user_id', user_id)
      .single();

    if (deploymentError || !deploymentData || !deploymentData.mvp_id) {
      console.error('Error verifying deployment record or mvp_id missing:', deploymentError, deploymentData);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Invalid deployment ID, unauthorized access, or missing MVP association.');
      return new Response(
        JSON.stringify({ error: 'Invalid deployment ID or unauthorized access' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Fetch the user's Netlify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('access_token')
      .eq('user_id', user_id)
      .eq('provider', 'netlify')
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('Error fetching Netlify token:', tokenError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Netlify authentication not found');
      return new Response(
        JSON.stringify({ error: 'Netlify authentication not found. Please connect your Netlify account.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const netlifyToken = tokenData.access_token;

    // Generate a unique site name
    // Use a fixed prefix, part of the deployment ID, and a small random string for uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 6); // 4 random alphanumeric characters
    let uniqueSiteName = `mvp-deploy-${deployment_id.substring(0, 8)}-${randomSuffix}`;
    // Further sanitize the site name to ensure it adheres to Netlify's conventions
    uniqueSiteName = uniqueSiteName
      .replace(/[^a-z0-9-]/g, '') // Ensure only allowed characters (lowercase, numbers, hyphens)
      .replace(/--+/g, '-')      // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, '');  // Trim leading/trailing hyphens

    // Extract GitHub repository owner and name from the URL
    const githubUrlMatch = github_repo_url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!githubUrlMatch) {
      console.error('Invalid GitHub repository URL:', github_repo_url);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Invalid GitHub repository URL format');
      return new Response(
        JSON.stringify({ error: 'Invalid GitHub repository URL format' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const [, repoOwner, repoName] = githubUrlMatch;

    // Fetch the user's GitHub token to get the numeric repository ID and private status
    const { data: githubTokenData, error: githubTokenError } = await supabase
      .from('user_oauth_tokens')
      .select('access_token')
      .eq('user_id', user_id)
      .eq('provider', 'github')
      .maybeSingle();

    if (githubTokenError || !githubTokenData) {
      console.error('Error fetching GitHub token:', githubTokenError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'GitHub token not found for fetching repo ID');
      return new Response(
        JSON.stringify({ error: 'GitHub token not found for fetching repo ID' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    const githubToken = githubTokenData.access_token;

    // Fetch the numeric GitHub repository ID and private status
    const githubRepoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!githubRepoResponse.ok) {
      const errorData = await githubRepoResponse.text();
      console.error('Failed to fetch GitHub repository details:', errorData);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to fetch GitHub repository details');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch GitHub repository details' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    const githubRepoData = await githubRepoResponse.json();
    const githubRepoId = githubRepoData.id; // This is the numeric ID
    const isRepoPrivate = githubRepoData.private; // Get private status

    // Fetch MVP build settings
    let buildCommand = 'npm run build'; // Default build command
    let publishDir = 'dist'; // Default publish directory

    if (deploymentData.mvp_id) {
      const { data: mvpDetails, error: mvpError } = await supabase
        .from('mvps')
        .select('build_command, publish_directory')
        .eq('id', deploymentData.mvp_id)
        .single();

      if (mvpError) {
        console.warn(`Could not fetch MVP build settings for mvp_id ${deploymentData.mvp_id}: ${mvpError.message}. Using defaults.`);
      } else if (mvpDetails) {
        buildCommand = mvpDetails.build_command || buildCommand;
        publishDir = mvpDetails.publish_directory || publishDir;
        console.log(`Using custom build settings for mvp_id ${deploymentData.mvp_id}: command='${buildCommand}', dir='${publishDir}'`);
      }
    } else {
        console.warn(`mvp_id not found on deployment record ${deployment_id}. Using default build settings.`);
    }

    // Step 1: Create a new Netlify site and link the repository simultaneously
    console.log(`Creating Netlify site for user ${user_id}: ${uniqueSiteName} with build command "${buildCommand}" and publish dir "${publishDir}"`);

    const netlifySitePayload = {
      name: uniqueSiteName,
      repo: {
        provider: 'github',
        id: githubRepoId,
        repo: `${repoOwner}/${repoName}`,
        private: isRepoPrivate,
        branch: 'main', // Assuming 'main', make configurable if needed
        cmd: buildCommand,
        dir: publishDir,
        functions_dir: null, // Or make configurable
      },
    };

    const createSiteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(netlifySitePayload),
    });

    if (!createSiteResponse.ok) {
      const errorText = await createSiteResponse.text(); // Use text() for better error details
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.message || errorJson.error || JSON.stringify(errorJson);
      } catch (e) { /* Not a JSON error, use raw text */ }

      console.error('Failed to create Netlify site:', errorDetail, 'Payload sent:', netlifySitePayload);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', `Failed to create Netlify site: ${errorDetail}`);
      return new Response(
        JSON.stringify({ error: 'Failed to create Netlify site' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const siteData = await createSiteResponse.json();
    const siteId = siteData.id;
    const siteUrl = siteData.ssl_url || siteData.url;
    const siteName = siteData.name;

    console.log(`Successfully created Netlify site: ${siteUrl} (ID: ${siteId})`);

    // Update deployment with Netlify site info and set status to 'netlify_site_created_pending_build'
    console.log(`Updating deployment ${deployment_id} with Netlify site info and new status.`);
    const { data: updatedDeployment, error: updateError } = await supabase
      .from('deployments')
      .update({
        netlify_site_url: siteUrl,
        netlify_site_id: siteId,
        status: 'netlify_site_created_pending_build', // New status
        netlify_deploy_id: siteData.build_id, // Netlify returns build_id on site creation with repo
        updated_at: new Date().toISOString(),
      })
      .eq('id', deployment_id)
      .select() // Select the updated record to log it
      .single(); // Expect a single record

    if (updateError) {
      console.error('Error updating deployment with Netlify info:', updateError);
      // The status was already 'netlify_configuring_site', if this fails, it might be better to leave it
      // or try to set a more specific error status if critical. For now, log and continue to return error.
      // await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to update deployment with Netlify site info after site creation.');
      return new Response(
        JSON.stringify({ error: 'Failed to update deployment with Netlify site info' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Log the final updated deployment record for debugging
    console.log('Final updated deployment record:', JSON.stringify(updatedDeployment));

    // Return success with Netlify site URL
    return new Response(
      JSON.stringify({
        success: true,
        site_url: siteUrl,
        site_id: siteId,
        site_name: siteName,
        build_id: siteData.build_id, // Return the build ID
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in create-netlify-site-from-github function:', error);
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
async function updateDeploymentStatus(supabase: any, deploymentId: string, status: string, errorMessage?: string) {
  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  try {
    await supabase
      .from('deployments')
      .update(updateData)
      .eq('id', deploymentId);
  } catch (error) {
    console.error(`Failed to update deployment status to ${status}:`, error);
  }
}
