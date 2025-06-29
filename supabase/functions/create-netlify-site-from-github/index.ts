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

    // Update deployment status to configuring_netlify
    await supabase
      .from('deployments')
      .update({
        status: 'configuring_netlify',
        updated_at: new Date().toISOString()
      })
      .eq('id', deployment_id);

    // Verify the deployment record exists and belongs to this user
    const { data: deploymentData, error: deploymentError } = await supabase
      .from('deployments')
      .select('*')
      .eq('id', deployment_id)
      .eq('user_id', user_id)
      .single();

    if (deploymentError || !deploymentData) {
      console.error('Error verifying deployment record:', deploymentError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Invalid deployment ID or unauthorized access');
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

    // Fetch the user's Netlify site name
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('netlify_site_name')
      .eq('id', user_id)
      .single();

    if (userError || !userData?.netlify_site_name) {
      console.error('Error fetching Netlify site name:', userError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Netlify site name not found');
      return new Response(
        JSON.stringify({ error: 'Netlify site name not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Generate a unique site name based on the user's Netlify site name and the deployment ID
    let baseSiteName = userData.netlify_site_name || 'mvp-project'; // Default if empty
    baseSiteName = baseSiteName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric (except hyphen) with hyphen
      .replace(/^-+|-+$/g, '')    // Remove leading/trailing hyphens
      .replace(/-+/g, '-');       // Replace multiple hyphens with single hyphen

    // Fallback if baseSiteName becomes empty after sanitization
    if (!baseSiteName) {
      baseSiteName = 'mvp-project';
    }

    const uniqueSiteName = `${baseSiteName}-${deployment_id.substring(0, 8)}`;

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

    // Fetch the user's GitHub token to get the numeric repository ID
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

    // Fetch the numeric GitHub repository ID
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

    // Step 1: Create a new Netlify site and link the repository simultaneously
    console.log(`Creating Netlify site for user ${user_id}: ${uniqueSiteName}`);

    const createSiteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: uniqueSiteName,
        repo: { // Add this repo object
          provider: 'github',
          id: githubRepoId, // Use the numeric GitHub repository ID here
          private: true, // Set to true if the repository is private
          branch: 'main', // Specify the main branch for deployment
          cmd: 'npm run build', // The build command for your project
          dir: 'dist', // The publish directory after building
          functions_dir: "", // Set to an empty string if you don't have Netlify Functions
       
        },
      }),
    });

    if (!createSiteResponse.ok) {
      const errorData = await createSiteResponse.text();
      console.error('Failed to create Netlify site:', errorData);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to create Netlify site');
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

    // Update deployment with Netlify site info and set status to completed
    await supabase
      .from('deployments')
      .update({
        netlify_site_url: siteUrl,
        netlify_site_id: siteId,
        status: 'completed', // Set status to completed directly after site creation
        netlify_deploy_id: siteData.build_id, // Netlify returns build_id on site creation with repo
        updated_at: new Date().toISOString(),
      })
      .eq('id', deployment_id);

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
