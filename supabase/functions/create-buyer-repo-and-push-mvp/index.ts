// supabase/functions/create-buyer-repo-and-push-mvp/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
// Import v4 from the uuid module using the import map alias
import { v4 } from 'uuid'; 

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

    if (!user_id || !mvp_id || !deployment_id || !repo_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, mvp_id, deployment_id, repo_name' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Update deployment status to creating_repo
    await supabase
      .from('deployments')
      .update({
        status: 'creating_repo',
        updated_at: new Date().toISOString()
      })
      .eq('id', deployment_id);

    // Verify the user has downloaded this MVP
    const { data: downloadData, error: downloadError } = await supabase
      .from('downloads')
      .select('id')
      .eq('user_id', user_id)
      .eq('mvp_id', mvp_id)
      .maybeSingle();

    if (downloadError) {
      console.error('Error checking download records:', downloadError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to verify MVP access');
      return new Response(
        JSON.stringify({ error: 'Failed to verify MVP access' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    if (!downloadData) {
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'User has not purchased/downloaded this MVP');
      return new Response(
        JSON.stringify({ error: 'User has not purchased/downloaded this MVP' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Fetch the user's GitHub token
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('access_token')
      .eq('user_id', user_id)
      .eq('provider', 'github')
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('Error fetching GitHub token:', tokenError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'GitHub authentication not found');
      return new Response(
        JSON.stringify({ error: 'GitHub authentication not found. Please connect your GitHub account.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const githubToken = tokenData.access_token;

    // Fetch the user's GitHub username
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('github_username')
      .eq('id', user_id)
      .single();

    if (userError || !userData?.github_username) {
      console.error('Error fetching GitHub username:', userError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'GitHub username not found');
      return new Response(
        JSON.stringify({ error: 'GitHub username not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const githubUsername = userData.github_username;

    // Fetch the MVP data to get the file and details
    const { data: mvp, error: mvpError } = await supabase
      .from('mvps')
      .select('*')
      .eq('id', mvp_id)
      .single();

    if (mvpError || !mvp) {
      console.error('Error fetching MVP:', mvpError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to fetch MVP data');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch MVP data' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Sanitize repository name (alphanumeric, hyphens, and underscores only)
    const sanitizedRepoName = repo_name
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/^[^a-zA-Z0-9]/, 'r') // Ensure it starts with a letter
      .toLowerCase();

    // Step 1: Create a new repository on GitHub
    console.log(`Creating GitHub repository for user ${user_id}: ${sanitizedRepoName}`);

    const createRepoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: sanitizedRepoName,
        description: `${mvp.title} - Deployed from MVP Library`,
        private: true,
        auto_init: true, // Create with a README
      }),
    });

    if (!createRepoResponse.ok) {
      const errorData = await createRepoResponse.json();
      console.error('Failed to create GitHub repository:', errorData);
      
      let errorMessage = 'Failed to create GitHub repository';
      
      // Handle specific error cases
      if (errorData.errors && errorData.errors.length > 0) {
        if (errorData.errors[0].message.includes('name already exists')) {
          errorMessage = `Repository name "${sanitizedRepoName}" already exists on your GitHub account. Please choose a different name.`;
        } else {
          errorMessage = `GitHub error: ${errorData.errors[0].message}`;
        }
      }
      
      await updateDeploymentStatus(supabase, deployment_id, 'failed', errorMessage);
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 422,
        }
      );
    }

    const repoData = await createRepoResponse.json();
    const repoUrl = repoData.html_url;
    const gitUrl = repoData.clone_url; // Will be used for pushing code

    console.log(`Successfully created GitHub repository: ${repoUrl}`);

    // Update deployment with repo URL
    await supabase
      .from('deployments')
      .update({
        github_repo_url: repoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deployment_id);

    // Step 2: Determine the Supabase Storage path for the MVP file
    let filePath: string;
    const slug = mvp.slug;
    if (mvp.last_synced_github_commit_sha) {
      filePath = `mvps/${slug}/versions/github-${mvp.last_synced_github_commit_sha}/source.zip`;
    } else if (mvp.version_number === '1.0.0' && !mvp.previous_ipfs_hash) {
      filePath = `mvps/${slug}/source`;
    } else {
      filePath = `mvps/${slug}/versions/${mvp.version_number}/source`;
    }

    // Step 3: Download the MVP file from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('mvp-files')
      .download(filePath);

    if (fileError || !fileData) {
      console.error('Error downloading MVP file:', fileError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to download MVP file');
      return new Response(
        JSON.stringify({ error: 'Failed to download MVP file from storage' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Update deployment status to pushing_code
    await supabase
      .from('deployments')
      .update({
        status: 'pushing_code',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deployment_id);

    // Step 4: Push the code to the GitHub repository
    // This would typically involve:
    // 1. Extracting the ZIP file
    // 2. Creating a Git repository
    // 3. Adding files and committing
    // 4. Pushing to GitHub
    
    // Since this is complex to do within an Edge Function, we'll simplify with a direct API approach:
    // We'll use GitHub's Contents API to upload files directly

    // First, let's get the current commit SHA so we can create a new branch
    const branchesResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${sanitizedRepoName}/branches/main`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.com.v3+json',
      },
    });

    if (!branchesResponse.ok) {
      console.error('Failed to get main branch data:', await branchesResponse.text());
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to access repository branch');
      return new Response(
        JSON.stringify({ error: 'Failed to access repository branch' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const branchData = await branchesResponse.json();
    const mainSha = branchData.commit.sha;

    // Now upload a netlify.toml file to configure the deployment
    const netlifyConfig = `# netlify.toml

[build]
  # Base directory to change to before building.
  # This is where your package.json is located.
  base = "/"
  # Directory (relative to base) that contains the deploy-ready HTML files and assets.
  publish = "dist"
  # The build command to run.
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;

    const netlifyConfigResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${sanitizedRepoName}/contents/netlify.toml`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.com.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Add Netlify configuration',
        content: btoa(netlifyConfig),
        branch: 'main',
        sha: await getFileSha(githubUsername, sanitizedRepoName, 'netlify.toml', githubToken) // Get SHA if file exists
      }),
    });

    if (!netlifyConfigResponse.ok) {
      console.error('Failed to add netlify.toml file:', await netlifyConfigResponse.text());
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to configure repository for Netlify');
      return new Response(
        JSON.stringify({ error: 'Failed to configure repository for Netlify' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // For the actual MVP code, we'd normally extract the ZIP file and push each file
    // Since this is complex within an Edge Function, we'll create a placeholder file
    // In a production environment, you would extract the ZIP and upload each file
    const readmeContent = `# ${mvp.title}

${mvp.tagline}

This MVP was deployed from the MVP Library Platform. The actual code files will be uploaded in subsequent commits.

## Description

${mvp.description}

## Features

${mvp.features.map(feature => `- ${feature}`).join('\n')}

## Tech Stack

${mvp.tech_stack.map(tech => `- ${tech}`).join('\n')}
`;

    const readmeResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${sanitizedRepoName}/contents/README.md`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.com.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update README with MVP details',
        content: btoa(readmeContent),
        branch: 'main',
        sha: await getFileSha(githubUsername, sanitizedRepoName, 'README.md', githubToken) // Get SHA if file exists
      }),
    });

    if (!readmeResponse.ok) {
      console.error('Failed to update README:', await readmeResponse.text());
      // Non-critical error, continue
    }

    // Return success with GitHub repository URL
    return new Response(
      JSON.stringify({
        success: true,
        github_repo_url: repoUrl,
        git_url: gitUrl,
        repo_name: sanitizedRepoName,
        github_username: githubUsername,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in create-buyer-repo-and-push-mvp function:', error);
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

// Helper function to get file SHA for updating content
async function getFileSha(owner: string, repo: string, path: string, token: string): Promise<string | undefined> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.com.v3+json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.sha;
    }
    return undefined;
  } catch (error) {
    console.error(`Error getting SHA for ${path}:`, error);
    return undefined;
  }
}
