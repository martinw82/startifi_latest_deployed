// railway-startifi-worker-main/index.js
import express from "express";
import fetch from "node-fetch";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createClient as createSupabaseClient } from "@supabase/supabase-js"; // Renamed to avoid conflict
import dotenv from "dotenv";
import cors from "cors";
// import { unrar } from 'node-unrar-js'; // Example if using a JS library for RAR

dotenv.config();

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

const supabase = createSupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Consistent status update helper
async function updateDeploymentStatus(deploymentId, status, errorMessage = null) {
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }
  console.log(`Worker updating deployment ${deploymentId} to status: ${status}, error: ${errorMessage || 'null'}`);
  try {
    const { error } = await supabase.from("deployments").update(updateData).eq("id", deploymentId);
    if (error) {
      console.error(`Worker failed to update Supabase status for ${deploymentId} to ${status}:`, error);
    }
  } catch (e) {
    console.error(`Worker: Catastrophic error during Supabase status update for ${deploymentId}:`, e);
  }
}

app.post("/deploy", async (req, res) => {
  const { deployment_id } = req.body;

  if (!deployment_id) {
    console.error("Worker: Deployment ID missing from request body.");
    return res.status(400).json({ error: "Deployment ID is required" });
  }

  // MODIFICATION: Changed status from 'worker_started' to 'pushing_code'
  await updateDeploymentStatus(deployment_id, 'pushing_code', null);

  // Fetch deployment metadata (includes storage_path, mvp_id, user_id, git_clone_url, repo_name, repo_owner)
  let deployment;
  try {
    const { data, error } = await supabase
      .from("deployments")
      .select("*")
      .eq("id", deployment_id)
      .single();

    if (error || !data) {
      console.error(`Worker: Deployment ${deployment_id} not found in Supabase.`, error);
      await updateDeploymentStatus(deployment_id, "failed", "Deployment record not found by worker.");
      return res.status(404).json({ error: "Deployment not found" });
    }
    deployment = data;
    if (!deployment.storage_path || !deployment.mvp_id || !deployment.user_id || !deployment.git_clone_url || !deployment.repo_name || !deployment.repo_owner) {
      const missingDetails = `Missing one or more critical fields in deployment record: storage_path, mvp_id, user_id, git_clone_url, repo_name, repo_owner.`;
      console.error(`Worker: ${missingDetails} for deployment ${deployment_id}`);
      await updateDeploymentStatus(deployment_id, "failed", missingDetails);
      return res.status(400).json({ error: missingDetails });
    }
  } catch (dbError) {
    console.error(`Worker: Error fetching deployment ${deployment_id} from Supabase:`, dbError);
    await updateDeploymentStatus(deployment_id, "failed", "Worker failed to fetch deployment details.");
    return res.status(500).json({ error: "Failed to fetch deployment details" });
  }

  // Fetch MVP metadata (build_command, publish_directory)
  let mvpMetadata;
  try {
    const { data, error } = await supabase
      .from("mvps")
      .select("build_command, publish_directory")
      .eq("id", deployment.mvp_id)
      .single();
    if (error || !data) {
      console.warn(`Worker: Could not fetch MVP metadata (build_command, publish_directory) for mvp_id ${deployment.mvp_id}. Will use defaults.`, error);
      mvpMetadata = {}; // Use defaults
    } else {
      mvpMetadata = data;
    }
  } catch (mvpDbError) {
    console.warn(`Worker: Error fetching MVP metadata for mvp_id ${deployment.mvp_id}. Will use defaults.`, mvpDbError);
    mvpMetadata = {}; // Use defaults
  }

  const tmpDir = path.join("./tmp", deployment_id); // Use deployment_id for unique temp dir
  const repoDir = path.join(tmpDir, deployment.repo_name);
  const archiveFileName = deployment.storage_path.split('/').pop(); // Get filename from storage_path
  const archivePath = path.join(tmpDir, archiveFileName);
  
  try {
    await updateDeploymentStatus(deployment_id, 'pushing_code', null); // Keep this status as it covers file processing and git operations

    // 1. Fetch GitHub token for the user
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('access_token')
      .eq('user_id', deployment.user_id)
      .eq('provider', 'github')
      .maybeSingle();

    if (tokenError || !tokenData?.access_token) {
      const errMsg = "Worker: GitHub token not found for user.";
      console.error(errMsg, tokenError);
      await updateDeploymentStatus(deployment_id, "failed", errMsg);
      return res.status(400).json({ error: errMsg });
    }
    const githubToken = tokenData.access_token;
    console.log(`Worker: GitHub token fetched for deployment ${deployment_id}.`);

    // Ensure temp directory exists and is clean
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpDir, { recursive: true });
    console.log(`Worker: Temporary directory created: ${tmpDir}`);

    // 2. Clone the GitHub repository (should be empty or have an initial commit)
    const cloneUrl = deployment.git_clone_url.replace('https://', `https://oauth2:${githubToken}@`);
    try {
      console.log(`Worker: Cloning ${deployment.git_clone_url} into ${repoDir} for deployment ${deployment_id}`);
      execSync(`git clone --depth 1 ${cloneUrl} ${repoDir}`, { stdio: 'pipe' }); // Use pipe to hide token from logs
      execSync(`git config user.name "StartiFi Deploy Bot"`, { cwd: repoDir });
      execSync(`git config user.email "deploy-bot@startifi.com"`, { cwd: repoDir });
      console.log(`Worker: Repository cloned successfully for deployment ${deployment_id}.`);
    } catch (gitCloneError) {
      const errMsg = `Worker: Failed to clone repository: ${gitCloneError.message}`;
      console.error(errMsg, gitCloneError.stderr?.toString());
      await updateDeploymentStatus(deployment_id, "failed", `Worker: Git clone error. ${gitCloneError.message}`);
      return res.status(500).json({ error: errMsg });
    }

    // 3. Download the MVP archive from Supabase Storage
    const supabaseBucket = process.env.SUPABASE_BUCKET;
    if (!supabaseBucket) {
      const errMsg = "Worker: SUPABASE_BUCKET env var not set.";
      console.error(errMsg);
      await updateDeploymentStatus(deployment_id, "failed", errMsg);
      return res.status(500).json({ error: errMsg });
    }

    console.log(`Worker: Downloading MVP archive from Supabase bucket '${supabaseBucket}', path '${deployment.storage_path}' for deployment ${deployment_id}`);
    const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
      .from(supabaseBucket)
      .createSignedUrl(deployment.storage_path, 3600); // 1 hour expiry

    if (signedUrlErr || !signedUrlData?.signedUrl) {
      const errMsg = `Worker: Failed to get signed URL for MVP file: ${signedUrlErr?.message || 'No signed URL'}`;
      console.error(errMsg, signedUrlErr);
      await updateDeploymentStatus(deployment_id, "failed", errMsg);
      return res.status(500).json({ error: errMsg });
    }

    const archiveResponse = await fetch(signedUrlData.signedUrl);
    if (!archiveResponse.ok) {
      const errMsg = `Worker: Failed to download archive: ${archiveResponse.statusText}`;
      console.error(errMsg);
      await updateDeploymentStatus(deployment_id, "failed", errMsg);
      return res.status(500).json({ error: errMsg });
    }
    const fileStream = fs.createWriteStream(archivePath);
    await new Promise((resolve, reject) => {
      archiveResponse.body.pipe(fileStream);
      archiveResponse.body.on("error", reject);
      fileStream.on("finish", resolve);
    });
    console.log(`Worker: MVP archive downloaded to ${archivePath} for deployment ${deployment_id}.`);

    // 4. Extract the archive contents into the cloned repository
    console.log(`Worker: Extracting archive ${archivePath} to ${repoDir} for deployment ${deployment_id}`);
    try {
      if (archiveFileName.endsWith('.zip')) {
        const zip = new AdmZip(archivePath);
        zip.extractAllTo(repoDir, true); // true to overwrite
      } else if (archiveFileName.endsWith('.tar.gz')) {
        execSync(`tar -xzf "${archivePath}" -C "${repoDir}"`, { stdio: 'pipe' });
      } else if (archiveFileName.endsWith('.rar')) {
        // IMPORTANT: Ensure 'unrar' CLI tool is available in the Railway environment.
        // Or, use a Node.js library like 'node-unrar-js' (would require adding it as a dependency and different code).
        // Example with CLI:
        try {
            execSync(`unrar x -o+ "${archivePath}" "${repoDir}"`, { stdio: 'pipe' }); // -o+ to overwrite
        } catch (unrarError) {
            console.error("Worker: Failed to extract RAR. 'unrar' CLI might be missing or archive is problematic.", unrarError);
            throw new Error("Failed to extract RAR archive. Ensure 'unrar' tool is available or use a supported archive type.");
        }
      } else {
        throw new Error(`Unsupported archive type: ${archiveFileName}`);
      }
      console.log(`Worker: Archive extracted for deployment ${deployment_id}.`);
    } catch (extractError) {
      const errMsg = `Worker: Failed to extract archive: ${extractError.message}`;
      console.error(errMsg, extractError);
      await updateDeploymentStatus(deployment_id, "failed", errMsg);
      return res.status(500).json({ error: errMsg });
    }

    // Delete the downloaded archive file - DO NOT COMMIT IT
    fs.unlinkSync(archivePath);
    console.log(`Worker: Deleted archive file ${archivePath} for deployment ${deployment_id}.`);

    // 5. Create netlify.toml
    const buildCommand = mvpMetadata.build_command || "npm run build"; // Default
    const publishDir = mvpMetadata.publish_directory || "dist"; // Default
    const netlifyTomlContent = `[build]
  command = "${buildCommand}"
  publish = "${publishDir}"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
    fs.writeFileSync(path.join(repoDir, 'netlify.toml'), netlifyTomlContent);
    console.log(`Worker: netlify.toml created with command='${buildCommand}', publish='${publishDir}' for deployment ${deployment_id}.`);

    // 6. Add, commit, and push the extracted files + netlify.toml
    try {
      execSync(`git add .`, { cwd: repoDir });
      // Check if there are changes to commit
      const statusOutput = execSync('git status --porcelain', { cwd: repoDir }).toString();
      if (statusOutput) {
        execSync(`git commit -m "feat: Unpack MVP and configure for Netlify deployment"`, { cwd: repoDir });
        console.log(`Worker: Files committed for deployment ${deployment_id}.`);
      } else {
        console.log(`Worker: No changes to commit for deployment ${deployment_id}. Repo might have been initialized with content already.`);
      }
      execSync(`git push origin HEAD`, { cwd: repoDir, stdio: 'pipe' }); // Push current branch
      console.log(`Worker: Code pushed to GitHub for deployment ${deployment_id}.`);
    } catch (gitPushError) {
      const errMsg = `Worker: Failed to push code to GitHub: ${gitPushError.message}`;
      console.error(errMsg, gitPushError.stderr?.toString());
      await updateDeploymentStatus(deployment_id, "failed", `Worker: Git push error. ${gitPushError.message}`);
      return res.status(500).json({ error: errMsg });
    }

    await updateDeploymentStatus(deployment_id, 'configuring_netlify', null); // Changed status to configuring_netlify
    console.log(`Worker: Deployment ${deployment_id} successfully processed. Status: configuring_netlify.`);
    res.json({ success: true, message: "Worker processed deployment successfully. Code pushed to GitHub." });

  } catch (err) {
    console.error(`Worker: Deployment ${deployment_id} failed in main try-catch:`, err);
    const errorMessage = err.message || "An unexpected error occurred during worker processing.";
    // Avoid double update if status was already set to failed by a specific catch block
    const { data: currentDeployment } = await supabase.from("deployments").select("status").eq("id", deployment_id).single();
    if (currentDeployment && currentDeployment.status !== "failed") {
        await updateDeploymentStatus(deployment_id, "failed", errorMessage);
    }
    res.status(500).json({ error: "Worker processing failed", details: errorMessage });
  } finally {
    // Clean up temporary directory
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      console.log(`Worker: Cleaned up temporary directory: ${tmpDir} for deployment ${deployment_id}`);
    }
  }
});

const PORT = process.env.PORT || 3001; // Changed default port to avoid conflict with potential vite dev server
app.listen(PORT, () => console.log(`🚀 StartiFi Deployment Worker running on port ${PORT}`));
