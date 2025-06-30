// src/types/index.ts
export interface User {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  bio?: string;
  profile_picture_url?: string;
  website_url?: string;
  social_links?: Record<string, string>;
  role: 'buyer' | 'seller' | 'admin' | 'both';
  stripe_customer_id?: string;
  stripe_account_id?: string;
  downloads_remaining: number;
  download_quota?: number;
  daily_download_limit?: number;
  last_download_date?: string;
  last_quota_reset_at: string;
  is_seller_approved: boolean;
  created_at: string;
  updated_at: string;
  github_app_installation_id?: number; // New: GitHub App installation ID for the user
  github_username?: string; // GitHub username for public display
  netlify_site_name?: string; // Netlify site name for deployments
}

export interface MvpVersionHistoryEntry {
  version_number: string;
  ipfs_hash: string;
  changelog?: string;
  uploaded_at: string;
  file_size?: number;
}

export interface MVP {
  id: string;
  seller_id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  features: string[];
  tech_stack: string[];
  category: string;
  ipfs_hash: string;
  previous_ipfs_hash?: string;
  version_history?: MvpVersionHistoryEntry[];
  file_size: number;
  preview_images: string[];
  demo_url?: string;
  github_url?: string;
  licensing_terms: 'standard_commercial' | 'premium_commercial' | 'personal_use_only';
  status: 'pending_review' | 'scan_failed' | 'approved' | 'rejected' | 'archived' | 'ipfs_pin_failed';
  version_number: string;
  changelog?: string;
  github_repo_owner?: string;
  github_repo_name?: string;
  last_synced_github_commit_sha?: string;
  github_webhook_secret?: string; // Existing: Unique secret for GitHub webhooks
  last_processing_error?: string; // New: To store error messages during processing
  access_tier?: 'free' | 'subscription' | 'one_time_sale'; // New: Access tier for the MVP
  download_count: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  price?: number;
  seller?: {
    id: string;
    email: string;
  };
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  plan_type: 'basic' | 'pro' | 'premium' | 'enterprise';
  status: string;
  current_period_start: string;
  current_period_end: string;
  downloads_quota: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  mvp_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  is_verified_buyer: boolean;
  user?: {
    email: string;
  };
}

export interface Download {
  id: string;
  user_id: string;
  mvp_id: string;
  downloaded_at: string;
  month_year: string;
  mvps?: {
    id: string;
    title: string;
    slug: string;
    preview_images: string[];
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  downloads_quota: number;
  features: string[];
  recommended?: boolean;
}

export interface Deployment {
  id: string;
  user_id: string;
  mvp_id: string;
  github_repo_url: string;
  netlify_site_url: string;
  netlify_site_id: string;
  netlify_deploy_id: string;
  status: 'initializing' | 'creating_repo' | 'pushing_code' | 'configuring_netlify' | 'deploying' | 'completed' | 'failed';
  error_message?: string;
  custom_domain?: string;
  build_settings?: Record<string, any>;
  deploy_settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OAuthToken {
  id: string;
  user_id: string;
  provider: 'github' | 'netlify';
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}