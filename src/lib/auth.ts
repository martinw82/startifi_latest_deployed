// src/lib/auth.ts
import { supabase } from './supabase';
import type { User } from '../types';

export class AuthService {
  static async signUp(email: string, password: string, role: 'buyer' | 'seller' = 'buyer') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Create profile with email
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            email: email, // Store email in profiles table
            role,
            downloads_remaining: 0,
            is_seller_approved: false,
            // username will be null initially, can be updated later
          },
        ]);

      if (profileError) throw profileError;
    }

    return data;
  }

  static async signIn(email: string, password: string) {
    // Check for beta account
    if (email === 'beta' && password === 'beta') {
      // Return mock beta user data
      const betaUser = {
        id: 'beta-user-123',
        email: 'beta@mvplibrary.dev',
        username: 'betauser', // Added username for beta user
        role: 'both' as const,
        stripe_customer_id: 'cus_beta123',
        stripe_account_id: 'acct_beta123',
        downloads_remaining: 999,
        download_quota: 999,
        daily_download_limit: 50,
        last_download_date: new Date().toISOString(),
        last_quota_reset_at: new Date().toISOString(),
        is_seller_approved: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
        github_app_installation_id: 123456, // Example installation ID for beta user
      };

      // Store beta user in localStorage for persistence
      localStorage.setItem('beta_user', JSON.stringify(betaUser));
      
      return {
        user: {
          id: betaUser.id,
          email: betaUser.email,
        },
        session: {
          access_token: 'beta_token_123',
          refresh_token: 'beta_refresh_123',
        }
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  static async signOut() {
    // Clear beta user if exists
    localStorage.removeItem('beta_user');
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser(): Promise<User | null> {
    // Check for beta user first
    const betaUser = localStorage.getItem('beta_user');
    if (betaUser) {
      return JSON.parse(betaUser);
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*') // Select all columns, including username
      .eq('id', user.id)
      .single();

    // Handle case where profile doesn't exist for authenticated user
    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found for this user, create one automatically
        console.log('Profile not found for user, creating default profile...');
        
        try {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: user.id,
                email: user.email!, // Store email from auth user
                role: 'buyer',
                downloads_remaining: 0,
                is_seller_approved: false,
                // username will be null initially
              },
            ])
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            return null;
          }

          // Return the newly created profile (email is already included)
          return newProfile;
        } catch (createError) {
          console.error('Failed to create profile for existing user:', createError);
          return null;
        }
      }
      throw error;
    }

    // Return the profile (email and username are included from the database)
    return profile;
  }

  static async updateProfile(updates: Partial<User>) {
    // Handle beta user updates
    const betaUser = localStorage.getItem('beta_user');
    if (betaUser) {
      const user = JSON.parse(betaUser);
      const updatedUser = { ...user, ...updates };
      localStorage.setItem('beta_user', JSON.stringify(updatedUser));
      return updatedUser;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates) // 'updates' object can contain username
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
