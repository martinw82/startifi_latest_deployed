/*
  # Initial MVP Library Platform Database Schema

  1. New Tables
    - `profiles` - User profiles extending Supabase auth
    - `subscriptions` - User subscription plans and status
    - `mvps` - MVP project listings with metadata
    - `downloads` - Track user downloads for quota management
    - `reviews` - User reviews and ratings for MVPs
    - `notifications` - System notifications for users
    - `payouts` - Commission payouts for sellers
    - `refund_requests` - Handle subscription refund requests
    - `disputes` - Buyer-seller dispute resolution
    - `audit_logs` - System audit trail for sensitive actions

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for data access control
    - Separate policies for users, sellers, and admins

  3. Features
    - Complete user management with roles
    - MVP submission and approval workflow
    - Subscription-based download system
    - Review and rating system
    - Seller commission tracking
    - Admin moderation capabilities
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  role TEXT CHECK (role IN ('buyer', 'seller', 'admin', 'both')) NOT NULL DEFAULT 'buyer',
  stripe_customer_id TEXT UNIQUE,
  stripe_account_id TEXT UNIQUE,
  downloads_remaining INTEGER DEFAULT 0 NOT NULL,
  last_quota_reset_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_seller_approved BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  plan_type TEXT CHECK (plan_type IN ('basic', 'pro', 'premium', 'enterprise')) NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  downloads_quota INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- MVP Projects
CREATE TABLE IF NOT EXISTS mvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL,
  ipfs_hash TEXT NOT NULL,
  previous_ipfs_hash TEXT,
  file_size INTEGER NOT NULL,
  preview_images TEXT[] NOT NULL DEFAULT '{}',
  demo_url TEXT,
  github_url TEXT,
  licensing_terms TEXT DEFAULT 'standard_commercial' NOT NULL CHECK (licensing_terms IN ('standard_commercial', 'premium_commercial', 'personal_use_only')),
  status TEXT CHECK (status IN ('pending_review', 'scan_failed', 'approved', 'rejected', 'archived')) NOT NULL DEFAULT 'pending_review',
  version_number TEXT DEFAULT '1.0.0' NOT NULL,
  changelog TEXT,
  download_count INTEGER DEFAULT 0 NOT NULL,
  average_rating DECIMAL(2,1) DEFAULT 0.0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  published_at TIMESTAMPTZ
);

-- Downloads tracking
CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  mvp_id UUID REFERENCES mvps(id) NOT NULL,
  downloaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  month_year TEXT NOT NULL,
  download_ip INET,
  user_agent TEXT,
  UNIQUE(user_id, mvp_id, month_year)
);

-- Reviews and ratings
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  mvp_id UUID REFERENCES mvps(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_verified_buyer BOOLEAN DEFAULT FALSE NOT NULL,
  UNIQUE(user_id, mvp_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Commission payouts
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  month_year TEXT NOT NULL,
  total_downloads INTEGER NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  platform_fee_deducted DECIMAL(10,2) NOT NULL,
  stripe_transfer_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- Refund Requests
CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) NOT NULL,
  reason TEXT NOT NULL,
  amount_requested DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'processed')) NOT NULL DEFAULT 'pending',
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  stripe_refund_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES profiles(id) NOT NULL,
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  mvp_id UUID REFERENCES mvps(id) NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_review', 'resolved_buyer', 'resolved_seller', 'closed_no_action')) NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_details TEXT
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all subscriptions" ON subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for mvps
CREATE POLICY "Public can view approved MVPs" ON mvps FOR SELECT USING (status = 'approved');
CREATE POLICY "Sellers can view own MVPs" ON mvps FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own MVPs" ON mvps FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can insert new MVPs" ON mvps FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Admins can manage all MVPs" ON mvps FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for downloads
CREATE POLICY "Users can view own downloads" ON downloads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own downloads" ON downloads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all downloads" ON downloads FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for reviews
CREATE POLICY "Public can view reviews" ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete/manage reviews" ON reviews FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON notifications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for payouts
CREATE POLICY "Sellers can view own payouts" ON payouts FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Admins can manage all payouts" ON payouts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for refund_requests
CREATE POLICY "Users can view own refund requests" ON refund_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own refund requests" ON refund_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all refund requests" ON refund_requests FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for disputes
CREATE POLICY "Users can view own disputes" ON disputes FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can insert own disputes" ON disputes FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Admins can manage all disputes" ON disputes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_seller_approved ON profiles(is_seller_approved);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_mvps_seller_id ON mvps(seller_id);
CREATE INDEX IF NOT EXISTS idx_mvps_status ON mvps(status);
CREATE INDEX IF NOT EXISTS idx_mvps_category ON mvps(category);
CREATE INDEX IF NOT EXISTS idx_mvps_tech_stack ON mvps USING GIN(tech_stack);
CREATE INDEX IF NOT EXISTS idx_mvps_published_at ON mvps(published_at);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_mvp_id ON downloads(mvp_id);
CREATE INDEX IF NOT EXISTS idx_downloads_month_year ON downloads(month_year);
CREATE INDEX IF NOT EXISTS idx_reviews_mvp_id ON reviews(mvp_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mvps_updated_at BEFORE UPDATE ON mvps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();