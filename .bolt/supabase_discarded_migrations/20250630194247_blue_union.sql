/*
  # Enhance Deployments Schema for Better Integration

  1. Fixes & Enhancements
    - Add missing column `repo_name` if not present 
    - Add missing column `repo_url` if not present
    - Add missing column `repo_owner` if not present
    - Ensure `branch` column exists with default 'main'
    - Add explicit index on `user_id`
    - Improve status validation constraint
    
  2. Purpose
    - Ensure all required fields for Railway worker integration are present
    - Improve query performance for user lookups
    - Standardize status values for better state management
*/

-- Add any missing columns that might be needed for deployments
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS repo_name TEXT;

ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS repo_url TEXT;

ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS repo_owner TEXT;

ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'main';

-- Add index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);

-- Ensure status check constraint matches our needs
ALTER TABLE deployments DROP CONSTRAINT IF EXISTS deployments_status_check;
ALTER TABLE deployments ADD CONSTRAINT deployments_status_check 
  CHECK (status IN ('initializing', 'creating_repo', 'pushing_code', 'configuring_netlify', 'deploying', 'completed', 'failed', 'repo_created'));

-- Make a comment explaining the status flow
COMMENT ON COLUMN deployments.status IS 'Tracks the current state of the deployment: initializing → creating_repo → repo_created → pushing_code → configuring_netlify → deploying → completed (or failed at any step)';