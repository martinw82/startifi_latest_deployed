/*
  # Fix RLS Policies to Prevent Infinite Recursion

  1. Security Function
    - Create `is_admin()` function with SECURITY DEFINER to bypass RLS
    - This prevents infinite recursion when checking admin status

  2. Policy Updates
    - Drop all existing policies before recreating them
    - Replace broad "manage all" policies with specific CRUD policies
    - Use the secure `is_admin()` function for admin checks

  3. Tables Updated
    - profiles, subscriptions, mvps, downloads, reviews
    - notifications, payouts, refund_requests, disputes, audit_logs
*/

-- Create a secure function to check if current user is admin
-- SECURITY DEFINER means it runs with the privileges of the function owner
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Grant execute permission to public so RLS policies can use it
GRANT EXECUTE ON FUNCTION is_admin() TO public;

-- Drop ALL existing policies before recreating them to avoid conflicts

-- Profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Create new non-recursive policies for profiles table
CREATE POLICY "Users can view own profile" 
  ON profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles 
  FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON profiles 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "Admins can update all profiles" 
  ON profiles 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "Admins can insert profiles" 
  ON profiles 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete profiles" 
  ON profiles 
  FOR DELETE 
  USING (is_admin());

-- Subscriptions table policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can delete subscriptions" ON subscriptions;

CREATE POLICY "Users can view own subscriptions" 
  ON subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" 
  ON subscriptions 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "Admins can update all subscriptions" 
  ON subscriptions 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "Admins can insert subscriptions" 
  ON subscriptions 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete subscriptions" 
  ON subscriptions 
  FOR DELETE 
  USING (is_admin());

-- MVPs table policies
DROP POLICY IF EXISTS "Public can view approved MVPs" ON mvps;
DROP POLICY IF EXISTS "Sellers can view own MVPs" ON mvps;
DROP POLICY IF EXISTS "Sellers can update own MVPs" ON mvps;
DROP POLICY IF EXISTS "Sellers can insert new MVPs" ON mvps;
DROP POLICY IF EXISTS "Admins can manage all MVPs" ON mvps;
DROP POLICY IF EXISTS "Admins can view all MVPs" ON mvps;
DROP POLICY IF EXISTS "Admins can update all MVPs" ON mvps;
DROP POLICY IF EXISTS "Admins can insert MVPs" ON mvps;
DROP POLICY IF EXISTS "Admins can delete MVPs" ON mvps;

CREATE POLICY "Public can view approved MVPs" 
  ON mvps 
  FOR SELECT 
  USING (status = 'approved');

CREATE POLICY "Sellers can view own MVPs" 
  ON mvps 
  FOR SELECT 
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own MVPs" 
  ON mvps 
  FOR UPDATE 
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert new MVPs" 
  ON mvps 
  FOR INSERT 
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Admins can view all MVPs" 
  ON mvps 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "Admins can update all MVPs" 
  ON mvps 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "Admins can insert MVPs" 
  ON mvps 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete MVPs" 
  ON mvps 
  FOR DELETE 
  USING (is_admin());

-- Downloads table policies
DROP POLICY IF EXISTS "Users can view own downloads" ON downloads;
DROP POLICY IF EXISTS "Users can insert own downloads" ON downloads;
DROP POLICY IF EXISTS "Admins can view all downloads" ON downloads;
DROP POLICY IF EXISTS "Admins can update all downloads" ON downloads;
DROP POLICY IF EXISTS "Admins can insert downloads" ON downloads;
DROP POLICY IF EXISTS "Admins can delete downloads" ON downloads;

CREATE POLICY "Users can view own downloads" 
  ON downloads 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own downloads" 
  ON downloads 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all downloads" 
  ON downloads 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "Admins can update all downloads" 
  ON downloads 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "Admins can insert downloads" 
  ON downloads 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete downloads" 
  ON downloads 
  FOR DELETE 
  USING (is_admin());

-- Reviews table policies
DROP POLICY IF EXISTS "Public can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can delete/manage reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can update all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON reviews;

CREATE POLICY "Public can view reviews" 
  ON reviews 
  FOR SELECT 
  USING (TRUE);

CREATE POLICY "Users can insert own reviews" 
  ON reviews 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" 
  ON reviews 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reviews" 
  ON reviews 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "Admins can update all reviews" 
  ON reviews 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "Admins can insert reviews" 
  ON reviews 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete reviews" 
  ON reviews 
  FOR DELETE 
  USING (is_admin());

-- Notifications table policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can update all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON notifications;

CREATE POLICY "Users can view own notifications" 
  ON notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
  ON notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications" 
  ON notifications 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "Admins can update all notifications" 
  ON notifications 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "Admins can insert notifications" 
  ON notifications 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete notifications" 
  ON notifications 
  FOR DELETE 
  USING (is_admin());

-- Payouts table policies
DROP POLICY IF EXISTS "Sellers can view own payouts" ON payouts;
DROP POLICY IF EXISTS "Admins can manage all payouts" ON payouts;
DROP POLICY IF EXISTS "Admins can view all payouts" ON payouts;
DROP POLICY IF EXISTS "Admins can update all payouts" ON payouts;
DROP POLICY IF EXISTS "Admins can insert payouts" ON payouts;
DROP POLICY IF EXISTS "Admins can delete payouts" ON payouts;

CREATE POLICY "Sellers can view own payouts" 
  ON payouts 
  FOR SELECT 
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all payouts" 
  ON payouts 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "Admins can update all payouts" 
  ON payouts 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "Admins can insert payouts" 
  ON payouts 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete payouts" 
  ON payouts 
  FOR DELETE 
  USING (is_admin());

-- Refund requests table policies
DROP POLICY IF EXISTS "Users can view own refund requests" ON refund_requests;
DROP POLICY IF EXISTS "Users can insert own refund requests" ON refund_requests;
DROP POLICY IF EXISTS "Admins can manage all refund requests" ON refund_requests;
DROP POLICY IF EXISTS "Admins can view all refund requests" ON refund_requests;
DROP POLICY IF EXISTS "Admins can update all refund requests" ON refund_requests;
DROP POLICY IF EXISTS "Admins can insert refund requests" ON refund_requests;
DROP POLICY IF EXISTS "Admins can delete refund requests" ON refund_requests;

CREATE POLICY "Users can view own refund requests" 
  ON refund_requests 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own refund requests" 
  ON refund_requests 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all refund requests" 
  ON refund_requests 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "Admins can update all refund requests" 
  ON refund_requests 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "Admins can insert refund requests" 
  ON refund_requests 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete refund requests" 
  ON refund_requests 
  FOR DELETE 
  USING (is_admin());

-- Disputes table policies
DROP POLICY IF EXISTS "Users can view own disputes" ON disputes;
DROP POLICY IF EXISTS "Users can insert own disputes" ON disputes;
DROP POLICY IF EXISTS "Admins can manage all disputes" ON disputes;
DROP POLICY IF EXISTS "Admins can view all disputes" ON disputes;
DROP POLICY IF EXISTS "Admins can update all disputes" ON disputes;
DROP POLICY IF EXISTS "Admins can insert disputes" ON disputes;
DROP POLICY IF EXISTS "Admins can delete disputes" ON disputes;

CREATE POLICY "Users can view own disputes" 
  ON disputes 
  FOR SELECT 
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can insert own disputes" 
  ON disputes 
  FOR INSERT 
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins can view all disputes" 
  ON disputes 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "Admins can update all disputes" 
  ON disputes 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "Admins can insert disputes" 
  ON disputes 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete disputes" 
  ON disputes 
  FOR DELETE 
  USING (is_admin());

-- Audit logs table policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can update audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can delete audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs" 
  ON audit_logs 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "Admins can update audit logs" 
  ON audit_logs 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "Admins can insert audit logs" 
  ON audit_logs 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete audit logs" 
  ON audit_logs 
  FOR DELETE 
  USING (is_admin());