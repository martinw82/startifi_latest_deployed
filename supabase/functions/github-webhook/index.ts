import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
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
console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY loaded:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Key is present' : 'Key is missing or empty');
    // You can also log a part of the key if you want to verify its content, but be careful not to expose the full key in logs in production.
    console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY prefix:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 5));

    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    const eventType = req.headers.get('x-github-event');

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const repoOwner = payload.repository?.owner?.login;
    const repoName = payload.repository?.name;

    if (!repoOwner || !repoName) {
      console.warn('Webhook payload missing repository information. Cannot verify secret.');
      return new Response(
        JSON.stringify({ error: 'Webhook payload missing repository information' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Fetch the webhook secret and GitHub App installation ID from the database for this specific repository
    const { data: mvpData, error: fetchError } = await supabase
      .from('mvps')
      .select('github_webhook_secret, github_app_installation_id')
      .eq('github_repo_owner', repoOwner)
      .eq('github_repo_name', repoName)
      .single();

    if (fetchError || !mvpData || !mvpData.github_webhook_secret) {
      console.error(`No MVP found or secret not configured for repository: ${repoOwner}/${repoName}`);
      return new Response(
        JSON.stringify({ error: 'Repository not linked or secret not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403, // Forbidden, as we can't verify authenticity
        }
      );
    }

    const mvpSecret = mvpData.github_webhook_secret;
    const githubAppInstallationId = mvpData.github_app_installation_id;

    // Verify webhook signature using the fetched secret
    const expectedSignature = `sha256=${createHmac('sha256', mvpSecret)
      .update(rawBody)
      .digest('hex')}`;

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature for repository:', `${repoOwner}/${repoName}`);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    console.log(`Received GitHub webhook: ${eventType} for repository: ${payload.repository?.full_name}`);

    let installationAccessToken: string | undefined;
    if (githubAppInstallationId) {
      try {
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-github-app-token', {
          body: { installation_id: githubAppInstallationId },
        });

        if (tokenError) {
          console.error('Error invoking get-github-app-token function:', tokenError);
          throw new Error('Failed to get GitHub App installation token');
        }
        if (tokenData?.token) {
          installationAccessToken = tokenData.token;
        } else {
          console.warn('get-github-app-token did not return a token.');
        }
      } catch (tokenFetchError) {
        console.error('Failed to fetch GitHub App installation token:', tokenFetchError);
        // Continue without token, but log the issue
      }
    }

    // Handle push events
    if (eventType === 'push') {
      await handlePushEvent(supabase, payload, installationAccessToken);
    } else if (eventType === 'release') {
      await handleReleaseEvent(supabase, payload, installationAccessToken);
    } else {
      console.log(`Ignoring unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error processing GitHub webhook:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function handlePushEvent(supabase: any, payload: any, installationAccessToken?: string) {
  const { repository, head_commit, ref } = payload;
  
  // Only process pushes to the default branch
  if (ref !== `refs/heads/${repository.default_branch}`) {
    console.log(`Ignoring push to non-default branch: ${ref}`);
    return;
  }

  if (!head_commit) {
    console.log('No head commit in push event');
    return;
  }

  const repoOwner = repository.owner.login;
  const repoName = repository.name;
  const commitSha = head_commit.id;
  const commitMessage = head_commit.message;

  console.log(`Processing push event for ${repoOwner}/${repoName}, commit: ${commitSha}`);

  // Find MVPs linked to this repository
  const { data: linkedMVPs, error: findError } = await supabase
    .from('mvps')
    .select('id, title, version_number, last_synced_github_commit_sha')
    .eq('github_repo_owner', repoOwner)
    .eq('github_repo_name', repoName);

  if (findError) {
    console.error('Error finding linked MVPs:', findError);
    throw new Error('Failed to find linked MVPs');
  }

  if (!linkedMVPs || linkedMVPs.length === 0) {
    console.log(`No MVPs linked to repository ${repoOwner}/${repoName}`);
    return;
  }

  console.log(`Found ${linkedMVPs.length} MVPs linked to ${repoOwner}/${repoName}`);

  // Process each linked MVP
  for (const mvp of linkedMVPs) {
    try {
      // Skip if already synced with this commit
      if (mvp.last_synced_github_commit_sha === commitSha) {
        console.log(`MVP ${mvp.id} already synced with commit ${commitSha}`);
        continue;
      }

      console.log(`Updating MVP ${mvp.id} (${mvp.title}) from commit ${commitSha}`);

      // Generate new version number (increment patch version)
      const newVersionNumber = incrementVersion(mvp.version_number);
      
      // Download repository archive
      const archiveUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/zipball/${commitSha}`;
      
      // Call the MVP update function
      await updateMVPFromGitHub(supabase, {
        mvpId: mvp.id,
        commitSha,
        changelog: `Automated update from GitHub\n\n${commitMessage}`,
        versionNumber: newVersionNumber,
        archiveUrl
      }, installationAccessToken); // Pass the token here

      console.log(`Successfully updated MVP ${mvp.id} from GitHub`);

    } catch (error: any) {
      console.error(`Error updating MVP ${mvp.id}:`, error);
      // Continue with other MVPs even if one fails
    }
  }
}

async function handleReleaseEvent(supabase: any, payload: any, installationAccessToken?: string) {
  const { repository, release, action } = payload;

  // Only process published releases
  if (action !== 'published') {
    console.log(`Ignoring release action: ${action}`);
    return;
  }

  const repoOwner = repository.owner.login;
  const repoName = repository.name;
  const releaseTag = release.tag_name;
  const releaseName = release.name;
  const releaseBody = release.body;
  const targetCommitish = release.target_commitish;

  console.log(`Processing release event for ${repoOwner}/${repoName}, release: ${releaseTag}`);

  // Find MVPs linked to this repository
  const { data: linkedMVPs, error: findError } = await supabase
    .from('mvps')
    .select('id, title, version_number, last_synced_github_commit_sha')
    .eq('github_repo_owner', repoOwner)
    .eq('github_repo_name', repoName);

  if (findError) {
    console.error('Error finding linked MVPs:', findError);
    throw new Error('Failed to find linked MVPs');
  }

  if (!linkedMVPs || linkedMVPs.length === 0) {
    console.log(`No MVPs linked to repository ${repoOwner}/${repoName}`);
    return;
  }

  console.log(`Found ${linkedMVPs.length} MVPs linked to ${repoOwner}/${repoName}`);

  // Process each linked MVP
  for (const mvp of linkedMVPs) {
    try {
      console.log(`Updating MVP ${mvp.id} (${mvp.title}) from release ${releaseTag}`);

      // Use the zipball URL from the release
      const archiveUrl = release.zipball_url;
      
      // Call the MVP update function
      await updateMVPFromGitHub(supabase, {
        mvpId: mvp.id,
        commitSha: targetCommitish,
        changelog: releaseBody || `Release ${releaseTag}${releaseName ? ` - ${releaseName}` : ''}`,
        versionNumber: releaseTag.replace(/^v/, ''), // Remove 'v' prefix if present
        archiveUrl
      }, installationAccessToken); // Pass the token here

      console.log(`Successfully updated MVP ${mvp.id} from GitHub release`);

    } catch (error: any) {
      console.error(`Error updating MVP ${mvp.id}:`, error);
      // Continue with other MVPs even if one fails
    }
  }
}

async function updateMVPFromGitHub(supabase: any, data: {
  mvpId: string;
  commitSha: string;
  changelog: string;
  versionNumber?: string;
  archiveUrl: string;
}, installationAccessToken?: string) { // Added installationAccessToken parameter
  try {
    // Get existing MVP data
    const { data: mvp, error: mvpError } = await supabase
      .from('mvps')
      .select('*')
      .eq('id', data.mvpId)
      .single();

    if (mvpError || !mvp) {
      throw new Error('MVP not found');
    }

    // Download the archive from GitHub
    const response = await fetch(data.archiveUrl, {
      headers: {
        'User-Agent': 'MVP-Library-Platform',
        'Accept': 'application/vnd.github.v3+json',
        ...(installationAccessToken && { 'Authorization': `Bearer ${installationAccessToken}` }) // Add Authorization header if token exists
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download repository archive: ${response.statusText}`);
    }

    const archiveBlob = await response.blob();
    
    // Upload to Supabase Storage
    const fileName = `${data.mvpId}-github-${data.commitSha.substring(0, 7)}.zip`;
    const filePath = `mvps/${mvp.slug}/versions/github-${data.commitSha}/source.zip`;

    const { error: uploadError } = await supabase.storage
      .from('mvp-files')
      .upload(filePath, archiveBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload archive to storage');
    }

    // Prepare version history entry
    const currentVersionEntry = {
      version_number: mvp.version_number,
      ipfs_hash: mvp.ipfs_hash,
      changelog: mvp.changelog || '',
      uploaded_at: mvp.published_at || mvp.created_at,
      file_size: mvp.file_size
    };

    const existingVersionHistory = mvp.version_history || [];
    const updatedVersionHistory = [currentVersionEntry, ...existingVersionHistory];

    // Update MVP record
    const mvpUpdateData = {
      previous_ipfs_hash: mvp.ipfs_hash,
      ipfs_hash: 'pending', // Will be updated after IPFS upload
      file_size: archiveBlob.size,
      version_number: data.versionNumber || incrementVersion(mvp.version_number),
      changelog: data.changelog,
      version_history: updatedVersionHistory,
      last_synced_github_commit_sha: data.commitSha,
      status: 'pending_review', // Reset to pending review for automated updates
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('mvps')
      .update(mvpUpdateData)
      .eq('id', data.mvpId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to update MVP with GitHub data');
    }

    // Queue for security scan and IPFS upload
    await queueIPFSUpload(supabase, data.mvpId, filePath);

    console.log(`Successfully updated MVP ${data.mvpId} from GitHub`);

  } catch (error: any) {
    console.error('Error in updateMVPFromGitHub:', error);
    throw error;
  }
}

async function queueIPFSUpload(supabase: any, mvpId: string, filePath: string) {
  try {
    // Call the pin-to-ipfs Edge Function
    const { error } = await supabase.functions.invoke('pin-to-ipfs', {
      body: {
        mvpId: mvpId,
        filePath: filePath
      }
    });

    if (error) {
      console.error('Error calling pin-to-ipfs function:', error);
      
      // Update MVP status to indicate IPFS pin failed
      await supabase
        .from('mvps')
        .update({ 
          status: 'ipfs_pin_failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);
    } else {
      console.log(`Queued IPFS upload for MVP ${mvpId}`);
    }
  } catch (error: any) {
    console.error('Error queuing IPFS upload:', error);
  }
}

function incrementVersion(currentVersion: string): string {
  try {
    const parts = currentVersion.split('.').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      // If version format is invalid, append a patch increment
      return `${currentVersion}.1`;
    }
    
    // Increment patch version
    parts[2] += 1;
    return parts.join('.');
  } catch (error) {
    // Fallback for any parsing errors
    return `${currentVersion}.1`;
  }
}
