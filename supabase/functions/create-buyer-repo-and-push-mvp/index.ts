// supabase/functions/create-buyer-repo-and-push-mvp/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('create-buyer-repo-and-push-mvp: Function invoked.');

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

    const requestBody = await req.json();
    console.log('create-buyer-repo-and-push-mvp: Received request body:', requestBody);

    const { user_id, mvp_id, deployment_id, repo_name } = requestBody;

    if (!user_id || !mvp_id || !deployment_id || !repo_name) {
      console.error('create-buyer-repo-and-push-mvp: Missing required fields in request body.');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, mvp_id, deployment_id, repo_name' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`create-buyer-repo-and-push-mvp: Updating deployment status to 'creating_repo' for deployment ID: ${deployment_id}`);
    await supabase
      .from('deployments')
      .update({
        status: 'creating_repo',
        updated_at: new Date().toISOString()
      })
      .eq('id', deployment_id);
    console.log('create-buyer-repo-and-push-mvp: Deployment status updated to creating_repo.');

    console.log(`create-buyer-repo-and-push-mvp: Verifying MVP access for user ${user_id} and MVP ${mvp_id}.`);
    const { data: downloadData, error: downloadError } = await supabase
      .from('downloads')
      .select('id')
      .eq('user_id', user_id)
      .eq('mvp_id', mvp_id)
      .maybeSingle();

    if (downloadError) {
      console.error('create-buyer-repo-and-push-mvp: Error checking download records:', downloadError);
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
      console.warn('create-buyer-repo-and-push-mvp: User has not purchased/downloaded this MVP.');
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'User has not purchased/downloaded this MVP');
      return new Response(
        JSON.stringify({ error: 'User has not purchased/downloaded this MVP' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }
    console.log('create-buyer-repo-and-push-mvp: MVP access verified.');

    console.log(`create-buyer-repo-and-push-mvp: Fetching GitHub token for user ${user_id}.`);
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('access_token')
      .eq('user_id', user_id)
      .eq('provider', 'github')
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('create-buyer-repo-and-push-mvp: Error fetching GitHub token:', tokenError);
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
    console.log('create-buyer-repo-and-push-mvp: GitHub token fetched.');

    console.log(`create-buyer-repo-and-push-mvp: Fetching GitHub username for user ${user_id}.`);
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('github_username')
      .eq('id', user_id)
      .single();

    if (userError || !userData?.github_username) {
      console.error('create-buyer-repo-and-push-mvp: Error fetching GitHub username:', userError);
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
    console.log(`create-buyer-repo-and-push-mvp: GitHub username fetched: ${githubUsername}.`);

    console.log(`create-buyer-repo-and-push-mvp: Fetching MVP data for MVP ID: ${mvp_id}.`);
    const { data: mvp, error: mvpError } = await supabase
      .from('mvps')
      .select('*')
      .eq('id', mvp_id)
      .single();

    if (mvpError || !mvp) {
      console.error('create-buyer-repo-and-push-mvp: Error fetching MVP:', mvpError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to fetch MVP data');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch MVP data' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    console.log('create-buyer-repo-and-push-mvp: MVP data fetched.');

    const sanitizedRepoName = repo_name
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/^[^a-zA-Z0-9]/, 'r')
      .toLowerCase();

    console.log(`create-buyer-repo-and-push-mvp: Attempting to create GitHub repository: ${sanitizedRepoName}`);
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
        auto_init: true,
      }),
    });

    if (!createRepoResponse.ok) {
      const errorData = await createRepoResponse.json();
      console.error('create-buyer-repo-and-push-mvp: Failed to create GitHub repository:', errorData);
      
      let errorMessage = 'Failed to create GitHub repository';
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
    const gitUrl = repoData.clone_url;

    console.log(`create-buyer-repo-and-push-mvp: Successfully created GitHub repository: ${repoUrl}`);

    console.log(`create-buyer-repo-and-push-mvp: Updating deployment with repo URL: ${repoUrl}`);
    await supabase
      .from('deployments')
      .update({
        github_repo_url: repoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deployment_id);
    console.log('create-buyer-repo-and-push-mvp: Deployment updated with repo URL.');

    console.log(`create-buyer-repo-and-push-mvp: Determining MVP file path for MVP ID: ${mvp_id}.`);
    let filePath: string;
    const slug = mvp.slug;
    if (mvp.last_synced_github_commit_sha) {
      filePath = `mvps/${slug}/versions/github-${mvp.last_synced_github_commit_sha}/source.zip`;
    } else if (mvp.version_number === '1.0.0' && !mvp.previous_ipfs_hash) {
      filePath = `mvps/${slug}/source`;
    } else {
      filePath = `mvps/${slug}/versions/${mvp.version_number}/source`;
    }
    console.log(`create-buyer-repo-and-push-mvp: MVP file path determined: ${filePath}.`);

    console.log(`create-buyer-repo-and-push-mvp: Downloading MVP file from Supabase Storage: ${filePath}.`);
    const { data: fileData, error: fileError } = await supabase.storage
      .from('mvp-files')
      .download(filePath);

    if (fileError || !fileData) {
      console.error('create-buyer-repo-and-push-mvp: Error downloading MVP file:', fileError);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to download MVP file');
      return new Response(
        JSON.stringify({ error: 'Failed to download MVP file from storage' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    console.log('create-buyer-repo-and-push-mvp: MVP file downloaded.');

    console.log(`create-buyer-repo-and-push-mvp: Updating deployment status to 'pushing_code'.`);
    await supabase
      .from('deployments')
      .update({
        status: 'pushing_code',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deployment_id);
    console.log('create-buyer-repo-and-push-mvp: Deployment status updated to pushing_code.');

    console.log(`create-buyer-repo-and-push-mvp: Fetching main branch data for ${githubUsername}/${sanitizedRepoName}.`);
    const branchesResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${sanitizedRepoName}/branches/main`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!branchesResponse.ok) {
      console.error('create-buyer-repo-and-push-mvp: Failed to get main branch data:', await branchesResponse.text());
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
    console.log(`create-buyer-repo-and-push-mvp: Main branch SHA: ${mainSha}.`);

    console.log('create-buyer-repo-and-push-mvp: Uploading netlify.toml file.');
    const netlifyConfig = `# netlify.toml

[build]
  base = "/"
  publish = "dist"
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
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Add Netlify configuration',
        content: btoa(netlifyConfig),
        branch: 'main',
        sha: await getFileSha(githubUsername, sanitizedRepoName, 'netlify.toml', githubToken)
      }),
    });

    if (!netlifyConfigResponse.ok) {
      console.error('create-buyer-repo-and-push-mvp: Failed to add netlify.toml file:', await netlifyConfigResponse.text());
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to configure repository for Netlify');
      return new Response(
        JSON.stringify({ error: 'Failed to configure repository for Netlify' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    console.log('create-buyer-repo-and-push-mvp: netlify.toml uploaded.');

    // Step 3: Create and upload GitHub Actions workflow file for automatically unpacking archives
    console.log('create-buyer-repo-and-push-mvp: Creating GitHub Actions workflow for unpacking archives.');
    
    // Directory creation is needed first for the workflows folder structure
    const workflowDirResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${sanitizedRepoName}/contents/.github/workflows`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Create workflows directory',
        content: btoa(''), // Empty content for directory creation
        branch: 'main'
      }),
    });
    
    // Only proceed if directory creation worked or if it failed because it already exists (422 error)
    if (!workflowDirResponse.ok && workflowDirResponse.status !== 422) {
      console.error('create-buyer-repo-and-push-mvp: Failed to create workflows directory:', await workflowDirResponse.text());
    }

    // Create GitHub Actions workflow file for unpacking archives
    const unpackWorkflowContent = `name: Unpack Archive

on:
  push:
    paths:
      - '**.zip'
      - '**.tar.gz'
      - '**.rar'

jobs:
  unpack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up environment
        run: |
          sudo apt-get update
          sudo apt-get install -y unzip
      - name: Find archive files
        id: find_archives
        run: |
          echo "archives=$(find . -type f -name "*.zip" -o -name "*.tar.gz" -o -name "*.rar" | xargs)" >> $GITHUB_OUTPUT
      - name: Unpack archive files
        if: steps.find_archives.outputs.archives != ''
        run: |
          for archive in ${{ steps.find_archives.outputs.archives }}; do
            echo "Unpacking $archive..."
            if [[ "$archive" == *.zip ]]; then
              unzip -o "$archive" -d .
              rm "$archive"
            elif [[ "$archive" == *.tar.gz ]]; then
              tar -xzf "$archive" -C .
              rm "$archive"
            elif [[ "$archive" == *.rar ]]; then
              unrar x "$archive" .
              rm "$archive"
            fi
          done
      - name: Commit extracted files
        if: steps.find_archives.outputs.archives != ''
        run: |
          git config user.name "GitHub Action Bot"
          git config user.email "action-bot@example.com"
          git add .
          git commit -m "Unpacked archive file(s) automatically"
          git push
`;

    const unpackWorkflowResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${sanitizedRepoName}/contents/.github/workflows/unpack.yml`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Add GitHub Actions workflow for unpacking archives',
        content: btoa(unpackWorkflowContent),
        branch: 'main',
      }),
    });

    if (!unpackWorkflowResponse.ok) {
      console.error('create-buyer-repo-and-push-mvp: Failed to create unpack workflow:', await unpackWorkflowResponse.text());
      // Continue anyway - this is not critical enough to fail the whole deployment
    } else {
      console.log('create-buyer-repo-and-push-mvp: GitHub Actions workflow for unpacking created successfully.');
    }

    console.log('create-buyer-repo-and-push-mvp: Uploading README.md file.');
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
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update README with MVP details',
        content: btoa(readmeContent),
        branch: 'main',
        sha: await getFileSha(githubUsername, sanitizedRepoName, 'README.md', githubToken)
      }),
    });

    if (!readmeResponse.ok) {
      console.error('create-buyer-repo-and-push-mvp: Failed to update README:', await readmeResponse.text());
    }
    console.log('create-buyer-repo-and-push-mvp: README.md uploaded.');
    
    // Determine the appropriate file extension
    let fileExtension = '.zip'; // Default extension
    const contentType = fileData.type;
    if (contentType === 'application/gzip' || contentType === 'application/x-gzip' || filePath.endsWith('.tar.gz')) {
      fileExtension = '.tar.gz';
    } else if (contentType === 'application/vnd.rar' || contentType === 'application/x-rar-compressed' || filePath.endsWith('.rar')) {
      fileExtension = '.rar';
    }
    
    // Upload the MVP archive to the repository root with its actual extension to trigger the GitHub Action
    const archiveFileName = `mvp-source${fileExtension}`;
    console.log(`create-buyer-repo-and-push-mvp: Uploading MVP archive as ${archiveFileName}...`);
    
    const archiveResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${sanitizedRepoName}/contents/${archiveFileName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Add MVP source archive',
        content: arrayBufferToBase64(fileBuffer),
        branch: 'main',
      }),
    });
    
    if (!archiveResponse.ok) {
      console.error(`create-buyer-repo-and-push-mvp: Failed to upload MVP archive: ${await archiveResponse.text()}`);
      await updateDeploymentStatus(supabase, deployment_id, 'failed', 'Failed to upload MVP archive to GitHub repository');
      return new Response(
        JSON.stringify({ error: 'Failed to upload MVP archive to GitHub repository' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    console.log('create-buyer-repo-and-push-mvp: MVP archive uploaded successfully.');

    console.log('create-buyer-repo-and-push-mvp: Returning success response.');
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
    console.error('create-buyer-repo-and-push-mvp: Error in function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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

async function getFileSha(owner: string, repo: string, path: string, token: string): Promise<string | undefined> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
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
