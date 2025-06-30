/*
  # Add Storage Path and Repo Owner to Deployments

  1. New Columns
    - `storage_path`: Path to the MVP file in Supabase Storage
    - `repo_owner`: GitHub username/organization that owns the repo
    - `repo_name`: Name of the GitHub repository (clarified)
    - `repo_url`: Full URL of the GitHub repository (clarified)
    - `branch`: Default branch for the repository (default: 'main')

  2. Purpose
    - Support integrated deployment with external Railway worker
    - Allow clean separation between repository creation and code push
    - Ensure all necessary information is available for the deployment flow
*/

-- Add storage_path column to deployments table
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add repo_name and repo_url if they don't exist (they might exist already)
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS repo_name TEXT;

ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS repo_url TEXT;

-- Add repo_owner column to deployments table
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS repo_owner TEXT;

-- Add branch column to deployments table with default 'main'
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'main';

-- Create index for faster queries by status and repo_owner
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_repo_owner ON deployments(repo_owner);

-- Add a comment to explain the purpose of the deployments table
COMMENT ON TABLE deployments IS 'Tracks Netlify deployments initiated by users, including GitHub repository details and deployment status';