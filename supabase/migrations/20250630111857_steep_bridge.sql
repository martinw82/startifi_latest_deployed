/*
  # Comprehensive Schema Update Summary

  This file provides documentation of all schema changes that have been implemented,
  including those from migrations that were accidentally removed from the migrations folder
  but were successfully applied to the database.
  
  1. Extended Profile Schema
    - Added display_name, bio, profile_picture_url, website_url, social_links
    - Added github_username, netlify_site_name for integration support
    - Added github_app_installation_id (moved from mvps table)
    
  2. Extended MVPs Schema
    - Added version_history as JSONB for tracking version changes
    - Added github_repo_owner, github_repo_name for repository linking
    - Added last_synced_github_commit_sha for tracking sync state
    - Added github_webhook_secret for securing webhooks
    - Added last_processing_error for tracking failures
    - Added access_tier and price for pricing models
    
  3. Deployment Support
    - Created deployments table for tracking Netlify deployments
    - Created user_oauth_tokens for securely storing integration tokens
    - Created state tables for GitHub and Netlify OAuth flows
    
  4. Additional Features
    - Added notifications table for platform notifications
    - Added refund_requests for subscription refunds
    - Added disputes for buyer-seller conflict resolution
    - Added utility functions for MVP ratings and downloads
    
  5. Stripe Integration
    - Added stripe_customers, stripe_subscriptions, stripe_orders
    - Created secure views for accessing Stripe data
    
  6. Security Enhancements
    - Created is_admin() function to prevent RLS recursion
    - Enhanced RLS policies for all tables
    - Added SECURITY DEFINER functions for critical operations
*/

-- Note: No actual SQL changes in this file, it serves as documentation.
-- All migrations have been successfully applied to the database.