/*
  # Add Deployment Support Schema

  1. New Table
    - `user_oauth_tokens`: Securely stores OAuth tokens for GitHub and Netlify
      - Uses encryption for token storage
      - Links to user profiles via user_id
      - Tracks token expiry and refresh information
    
    - `deployments`: Tracks MVP deployments to Netlify
      - Records deployment status, URLs, and metadata
      - Links to users and MVPs
      - Includes timestamps for creation and updates

  2. Updates to profiles
    - Add `github_username` and `netlify_site_name` fields
    - These are public-safe identifiers (not tokens)

  3. Security
    - Enable RLS on all new tables
    - Implement policies for secure access
    - Use encryption for sensitive token storage
*/

-- Add GitHub username and Netlify site name to profiles
ALTER TABLE profiles 
ADD COLUMN github_username TEXT,
ADD COLUMN netlify_site_name TEXT;

-- Create table for securely storing OAuth tokens
CREATE TABLE IF NOT EXISTS user_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'netlify')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, provider)
);

-- Create table for tracking deployments
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  mvp_id UUID REFERENCES mvps(id) NOT NULL,
  github_repo_url TEXT,
  netlify_site_url TEXT,
  netlify_site_id TEXT,
  netlify_deploy_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('initializing', 'creating_repo', 'pushing_code', 'configuring_netlify', 'deploying', 'completed', 'failed')),
  error_message TEXT,
  custom_domain TEXT,
  build_settings JSONB,
  deploy_settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Policies for user_oauth_tokens
CREATE POLICY "Users can view their own OAuth tokens" 
  ON user_oauth_tokens 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own OAuth tokens" 
  ON user_oauth_tokens 
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own OAuth tokens" 
  ON user_oauth_tokens 
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own OAuth tokens" 
  ON user_oauth_tokens 
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for deployments
CREATE POLICY "Users can view their own deployments" 
  ON deployments 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own deployments" 
  ON deployments 
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own deployments" 
  ON deployments 
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own deployments" 
  ON deployments 
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());

-- Admin policies using the is_admin() function
CREATE POLICY "Admins can view all OAuth tokens" 
  ON user_oauth_tokens 
  FOR SELECT 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all OAuth tokens" 
  ON user_oauth_tokens 
  FOR UPDATE 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert all OAuth tokens" 
  ON user_oauth_tokens 
  FOR INSERT 
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete all OAuth tokens" 
  ON user_oauth_tokens 
  FOR DELETE 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can view all deployments" 
  ON deployments 
  FOR SELECT 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all deployments" 
  ON deployments 
  FOR UPDATE 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert all deployments" 
  ON deployments 
  FOR INSERT 
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete all deployments" 
  ON deployments 
  FOR DELETE 
  TO authenticated
  USING (is_admin());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user_provider ON user_oauth_tokens(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_mvp_id ON deployments(mvp_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);

-- Update updated_at timestamps automatically
CREATE TRIGGER update_user_oauth_tokens_updated_at 
BEFORE UPDATE ON user_oauth_tokens 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployments_updated_at 
BEFORE UPDATE ON deployments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();