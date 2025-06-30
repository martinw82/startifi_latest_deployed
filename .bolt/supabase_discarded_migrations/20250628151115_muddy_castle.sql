/*
  # Create OAuth state tables for deployment flow

  1. New Tables
    - `github_oauth_states`: Securely tracks GitHub OAuth flow states
      - Prevents CSRF attacks during OAuth
      - Links to user profiles and MVPs
      - Includes expiration timestamps
    
    - `netlify_oauth_states`: Securely tracks Netlify OAuth flow states
      - Prevents CSRF attacks during OAuth
      - Links to deployments and GitHub repos
      - Includes expiration timestamps

  2. Security
    - Both tables track state tokens with expiration
    - State tokens expire after 5 minutes for security
    - RLS disabled as tables are only accessed by edge functions
*/

-- Create table for GitHub OAuth states
CREATE TABLE IF NOT EXISTS github_oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  state TEXT NOT NULL UNIQUE,
  mvp_id UUID REFERENCES mvps(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create table for Netlify OAuth states
CREATE TABLE IF NOT EXISTS netlify_oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  state TEXT NOT NULL UNIQUE,
  deployment_id UUID REFERENCES deployments(id) NOT NULL,
  github_repo_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_github_oauth_states_state ON github_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_github_oauth_states_user_id ON github_oauth_states(user_id);

CREATE INDEX IF NOT EXISTS idx_netlify_oauth_states_state ON netlify_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_netlify_oauth_states_user_id ON netlify_oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_netlify_oauth_states_deployment_id ON netlify_oauth_states(deployment_id);

-- RLS is disabled on these tables as they are only accessed by Edge Functions
-- which use the service role key.