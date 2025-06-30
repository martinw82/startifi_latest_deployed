/*
  # Newsletter Management System Database Schema

  1. New Tables
    - `newsletter_types` - Types of newsletters (e.g., Product Updates, Marketing)
    - `user_newsletter_subscriptions` - User-specific newsletter subscriptions
    - `newsletter_subscribers` - General email subscribers (not tied to user accounts)

  2. Indexes
    - Added appropriate indexes for performance
    
  3. Security
    - RLS policies for proper access control
    
  4. Dependencies
    - Requires existing `profiles` table for user relationships
*/

-- Newsletter Types
CREATE TABLE IF NOT EXISTS newsletter_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User Newsletter Subscriptions
CREATE TABLE IF NOT EXISTS user_newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  newsletter_type_id UUID NOT NULL REFERENCES newsletter_types(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  unsubscribed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  source TEXT,
  last_modified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, newsletter_type_id)
);

-- Newsletter Subscribers (for non-users)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  agreed_to_terms BOOLEAN NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_modified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  unsubscribed_at TIMESTAMPTZ,
  categories TEXT[] DEFAULT '{updates, marketing}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_newsletter_subscriptions_user ON user_newsletter_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_newsletter_subscriptions_type ON user_newsletter_subscriptions(newsletter_type_id);
CREATE INDEX IF NOT EXISTS idx_user_newsletter_subscriptions_status ON user_newsletter_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_types_is_active ON newsletter_types(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);

-- Enable Row Level Security
ALTER TABLE newsletter_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for newsletter_types
CREATE POLICY "Admins can manage newsletter_types" ON newsletter_types
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Public can view active newsletter_types" ON newsletter_types
  FOR SELECT
  USING (is_active);

-- RLS Policies for user_newsletter_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_newsletter_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscriptions" ON user_newsletter_subscriptions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON user_newsletter_subscriptions
  USING (is_admin())
  WITH CHECK (is_admin());

-- RLS Policies for newsletter_subscribers
CREATE POLICY "Admins can manage newsletter_subscribers" ON newsletter_subscribers
  USING (is_admin())
  WITH CHECK (is_admin());