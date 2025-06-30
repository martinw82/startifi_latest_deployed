// deploy-worker/index.js
import express from "express";
import fetch from "node-fetch"; // Explicitly import node-fetch for older Node.js versions or if global fetch is not desired
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables from .env file
dotenv.config();

const app = express();

// Apply CORS middleware
// For production, replace '*' with your specific frontend origin(s)
app.use(cors({
  origin: '*', // Or specify your frontend URL: 'https://your-frontend-domain.com'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON request bodies
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/deploy", async (req, res) => {
  const { deployment_id } = req.body;

  // Validate deployment_id
  if (!deployment_id) {
    console.error("Deployment ID is missing from request body.");
    return res.status(400).json({ error: "Deployment ID is required" });
  }

  // Fetch deployment metadata from Supabase
  let deployment;
  try {
    const { data, error } = await supabase
      .from("deployments")
      .select("*")
      .eq("id", deployment_id)
      .single();

    if (error || !data) {
      console.error(`Deployment ${deployment_id} not found:`, error);
      return res.status(404).json({ error: "Deployment not found" });
    }
    deployment = data;
  } catch (dbError) {
    console.error(`Error fetching deployment ${deployment_id} from Supabase:`, dbError);
    return res.status(500).json({ error: "Failed to fetch deployment details" });
  }

  // Define temporary directories
  // Use deployment ID for unique temp dir to avoid conflicts
  const tmpDir = path.join("./tmp", deployment.id); 
  const repoDir = path.join(tmpDir, deployment.repo_name);
  const zipPath = path.join(tmpDir, `${deployment.repo_name}.zip`);
  
  try {
    // Update status to "processing"
    await supabase.from("deployments").update({ status: "processing" }).eq("id", deployment.id);
    console.log(`Deployment ${deployment_id} status updated to processing.`);

    // 1. Fetch GitHub token for the user
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('access_token')
      .eq('user_id', deployment.user_id) // Use user_id from deployment
      .eq('provider', 'github')
      .maybeSingle();

    if (tokenError || !tokenData || !tokenData.access_token) {
      const errorMessage = "GitHub token not found for user. Please connect your GitHub account.";
      console.error(errorMessage, tokenError);
      await supabase.from("deployments").update({ status: "failed", error_message: errorMessage }).eq("id", deployment_id);
      return res.status(400).json({ error: errorMessage });
    }
    const githubToken = tokenData.access_token;
    console.log("GitHub token fetched successfully.");

    const repoOwner = deployment.repo_owner;
    const repoName = deployment.repo_name;
    const repoUrl = deployment.repo_url;
    const branch = deployment.branch || "main";

    if (!repoOwner || !repoName || !repoUrl) {
      const errorMessage = "Repository details (owner, name, url) missing in deployment record.";
      console.error(errorMessage);
      await supabase.from("deployments").update({ status: "failed", error_message: errorMessage }).eq("id", deployment_id);
      return res.status(400).json({ error: errorMessage });
    }

    // Ensure temp directory exists
    // fs.mkdirSync with recursive: true creates parent directories if they don't exist. [3, 9, 11, 12, 14]
    fs.mkdirSync(tmpDir, { recursive: true });
    console.log(`Temporary directory created: ${tmpDir}`);

    // 2. Clone the empty GitHub repository
    // Using GIT_ASKPASS or embedding token in URL is less secure.
    // A more secure way is to use GIT_USERNAME and GIT_PASSWORD environment variables.
    // For simplicity and common usage in CI/CD, embedding in URL is often seen, but be aware of risks.
    // execSync(`git clone https://oauth2:${githubToken}@github.com/${repoOwner}/${repoName}.git ${repoDir}`, { stdio: 'inherit' });
    // Alternative using GIT_USERNAME/GIT_PASSWORD for better security (requires git to be configured to use these)
    // Or, if using SSH keys, ensure the worker environment has access to the key.
    try {
      execSync(`git clone ${repoUrl} ${repoDir}`, { 
        stdio: 'inherit', 
        env: { ...process.env, GIT_USERNAME: 'oauth2', GIT_PASSWORD: githubToken } 
      });
      execSync(`git config user.name "AutoDeployBot"`, { cwd: repoDir });
      execSync(`git config user.email "bot@example.com"`, { cwd: repoDir });
      console.log(`Repository ${repoOwner}/${repoName} cloned into ${repoDir}`);
    } catch (gitCloneError) {
      const errorMessage = `Failed to clone repository: ${gitCloneError.message}`;
      console.error(errorMessage, gitCloneError);
      await supabase.from("deployments").update({ status: "failed", error_message: errorMessage }).eq("id", deployment_id);
      return res.status(500).json({ error: errorMessage });
    }

    // 3. Download the MVP ZIP from Supabase Storage
    // Ensure SUPABASE_BUCKET is defined in your .env
    const supabaseBucket = process.env.SUPABASE_BUCKET;
    if (!supabaseBucket) {
      const errorMessage = "SUPABASE_BUCKET environment variable is not set.";
      console.error(errorMessage);
      await supabase.from("deployments").update({ status: "failed", error_message: errorMessage }).eq("id", deployment_id);
      return res.status(500).json({ error: errorMessage });
    }

    const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
      .from(supabaseBucket)
      .createSignedUrl(deployment.storage_path, 3600); // Use storage_path from deployment

    if (signedUrlErr || !signedUrlData || !signedUrlData.signedUrl) {
      const errorMessage = `Failed to get signed URL for MVP file: ${signedUrlErr?.message || 'Unknown error'}`;
      console.error(errorMessage, signedUrlErr);
      await supabase.from("deployments").update({ status: "failed", error_message: errorMessage }).eq("id", deployment_id);
      return res.status(500).json({ error: errorMessage });
    }

    console.log(`Downloading MVP ZIP from ${signedUrlData.signedUrl}`);
    const zipResponse = await fetch(signedUrlData.signedUrl);
    if (!zipResponse.ok) {
      const errorMessage = `Failed to download ZIP: ${zipResponse.statusText}`;
      console.error(errorMessage);
      await supabase.from("deployments").update({ status: "failed", error_message: errorMessage }).eq("id", deployment_id);
      return res.status(500).json({ error: errorMessage });
    }

    const fileStream = fs.createWriteStream(zipPath);
    await new Promise((resolve, reject) => {
      zipResponse.body.pipe(fileStream);
      zipResponse.body.on("error", reject);
      fileStream.on("finish", resolve);
    });
    console.log(`MVP ZIP downloaded to ${zipPath}`);

    // 4. Extract the ZIP contents into the cloned repository
    console.log(`Extracting ZIP to ${repoDir}`);
    // AdmZip constructor takes the path to the zip file [4, 5, 10]
    const zip = new AdmZip(zipPath); 
    // extractAllTo extracts all files to the target path, true means overwrite existing [1, 2, 10]
    zip.extractAllTo(repoDir, true); 
    console.log("ZIP extracted.");

    // 5. Add, commit, and push the extracted files
    try {
      execSync(`git add .`, { cwd: repoDir });
      execSync(`git commit -m "Initial MVP code push"`, { cwd: repoDir });
      execSync(`git push origin ${branch}`, { cwd: repoDir });
      console.log("Code pushed to GitHub.");
    } catch (gitPushError) {
      const errorMessage = `Failed to push code to GitHub: ${gitPushError.message}`;
      console.error(errorMessage, gitPushError);
      await supabase.from("deployments").update({ status: "failed", error_message: errorMessage }).eq("id", deployment_id);
      return res.status(500).json({ error: errorMessage });
    }

    // Update status to "completed"
    await supabase.from("deployments").update({ status: "completed" }).eq("id", deployment.id);
    console.log(`Deployment ${deployment_id} status updated to completed.`);
    res.json({ success: true, message: "Deployment completed successfully" });

  } catch (err) {
    console.error("Deployment failed in main try-catch block:", err);
    const errorMessage = err.message || "An unexpected error occurred during deployment.";
    await supabase.from("deployments").update({ status: "failed", error_message: errorMessage }).eq("id", deployment_id);
    res.status(500).json({ error: "Deployment failed", details: errorMessage });
  } finally {
    // Clean up temporary directory
    if (fs.existsSync(tmpDir)) {
      // fs.rmSync with recursive: true and force: true removes non-empty directories [7, 8, 13, 16, 18]
      fs.rmSync(tmpDir, { recursive: true, force: true });
      console.log(`Cleaned up temporary directory: ${tmpDir}`);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Worker running on port ${PORT}`));
