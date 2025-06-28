import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'buyer' | 'seller' | 'admin' | 'both';
          stripe_customer_id: string | null;
          stripe_account_id: string | null;
          downloads_remaining: number;
          last_quota_reset_at: string;
          is_seller_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: 'buyer' | 'seller' | 'admin' | 'both';
          stripe_customer_id?: string | null;
          stripe_account_id?: string | null;
          downloads_remaining?: number;
          last_quota_reset_at?: string;
          is_seller_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'buyer' | 'seller' | 'admin' | 'both';
          stripe_customer_id?: string | null;
          stripe_account_id?: string | null;
          downloads_remaining?: number;
          last_quota_reset_at?: string;
          is_seller_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      mvps: {
        Row: {
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
          previous_ipfs_hash: string | null;
          file_size: number;
          preview_images: string[];
          demo_url: string | null;
          github_url: string | null;
          licensing_terms: 'standard_commercial' | 'premium_commercial' | 'personal_use_only';
          status: 'pending_review' | 'scan_failed' | 'approved' | 'rejected' | 'archived';
          version_number: string;
          changelog: string | null;
          download_count: number;
          average_rating: number;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
      };
      subscriptions: {
        Row: {
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
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          mvp_id: string;
          rating: number;
          review_text: string | null;
          created_at: string;
          is_verified_buyer: boolean;
        };
      };
      downloads: {
        Row: {
          id: string;
          user_id: string;
          mvp_id: string;
          downloaded_at: string;
          month_year: string;
          download_ip: string | null;
          user_agent: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          message: string;
          link: string | null;
          read: boolean;
          created_at: string;
        };
      };
    };
  };
};