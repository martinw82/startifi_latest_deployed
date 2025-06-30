// src/lib/api.ts
import { supabase } from './supabase';
import type { MVP, Review, Subscription, Download, RefundRequest, Dispute } from '../types';
import { MVPUploadService } from './mvpUpload';
import { v4 as uuidv4 } from 'uuid';

export class APIService {
  // MVP Management
  static async getMVPs(filters?: {
    category?: string;
    techStack?: string[];
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'download_count' | 'average_rating' | 'published_at';
    minPrice?: number;
    maxPrice?: number;
    licensingTerms?: string;
  }) {
    try {
      let query = supabase
        .from('mvps')
        .select(`
          *,
          profiles!mvps_seller_id_fkey(id, email, username)
        `)
        .eq('status', 'approved');

      if (filters?.category && filters.category !== 'All') {
        query = query.eq('category', filters.category);
      }

      if (filters?.techStack && filters.techStack.length > 0) {
        query = query.overlaps('tech_stack', filters.techStack);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,tagline.ilike.%${filters.search}%`);
      }

      if (filters?.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }

      if (filters?.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }

      if (filters?.licensingTerms && filters.licensingTerms !== 'all') {
        query = query.eq('licensing_terms', filters.licensingTerms);
      }

      if (filters?.sortBy) {
        query = query.order(filters.sortBy, { ascending: false });
      } else {
        query = query.order('published_at', { ascending: false });
      }

      const from = (filters?.page || 0) * (filters?.limit || 20);
      const to = from + (filters?.limit || 20) - 1;
      
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching MVPs:', error);
        throw error;
      }

      const mvps = data?.map(mvp => ({
        ...mvp,
        seller: mvp.profiles,
      })) || [];

      // Add demo MVP for showcase if no real data exists
      if (mvps.length === 0) {
        mvps.push({
          id: 'demo-mvp-1',
          seller_id: 'demo-seller',
          title: 'AI-Powered SaaS Starter Kit',
          slug: 'ai-saas-starter-kit',
          tagline: 'Complete SaaS boilerplate with AI integration, authentication, and payments',
          description: 'A comprehensive SaaS starter kit built with Next.js, Supabase, Stripe, and OpenAI integration. Features include user authentication, subscription management, AI-powered content generation, admin dashboard, and responsive design. Perfect for launching your AI-powered SaaS quickly.',
          features: [
            'AI Content Generation with OpenAI',
            'User Authentication & Authorization',
            'Stripe Subscription Management',
            'Admin Dashboard',
            'Responsive Design',
            'Email Templates',
            'Database Schema',
            'API Routes'
          ],
          tech_stack: ['Next.js', 'TypeScript', 'Supabase', 'Stripe', 'OpenAI', 'Tailwind CSS', 'Framer Motion'],
          category: 'SaaS',
          ipfs_hash: 'QmDemoHash123',
          file_size: 25165824, // 24MB
          preview_images: [
            'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=800',
            'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=800',
            'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800'
          ],
          demo_url: 'https://ai-saas-demo.vercel.app',
          github_url: 'https://github.com/demo/ai-saas-starter',
          licensing_terms: 'standard_commercial' as const,
          status: 'approved' as const,
          version_number: '2.1.0',
          changelog: 'Added OpenAI GPT-4 integration, improved dashboard UI, fixed authentication bugs',
          download_count: 1247,
          average_rating: 4.8,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-20T14:30:00Z',
          published_at: '2024-01-15T12:00:00Z',
          seller: {
            id: 'demo-seller',
            email: 'demo@mvplibrary.dev',
            username: 'demoseller'
          },
          access_tier: 'subscription' // Added access_tier
        });
      }

      return {
        mvps,
        total: count || mvps.length,
      };
    } catch (error) {
      console.error('Error in getMVPs:', error);
      throw error;
    }
  }

  static async getMVPById(mvpId: string): Promise<MVP | null> {
    console.log('APIService: Attempting to fetch MVP with ID:', mvpId); // Log the MVP ID
    try {
      const { data, error } = await supabase
        .from('mvps')
        .select(`
          *,
          profiles!mvps_seller_id_fkey(id, email, username)
        `)
        .eq('id', mvpId)
        .single();
      
      if (error) {
        console.error('APIService: Error fetching MVP by ID:', error); // Log the error
        throw error;
      }

      if (!data) {
        console.log('APIService: No MVP data found for ID:', mvpId); // Log if no data
        return null;
      }

      // Add demo MVP fallback if no real data exists
      if (mvpId === 'demo-mvp-1') {
        return {
          id: 'demo-mvp-1',
          seller_id: 'demo-seller',
          title: 'AI-Powered SaaS Starter Kit',
          slug: 'ai-saas-starter-kit',
          tagline: 'Complete SaaS boilerplate with AI integration, authentication, and payments',
          description: 'A comprehensive SaaS starter kit built with Next.js, Supabase, Stripe, and OpenAI integration. Features include user authentication, subscription management, AI-powered content generation, admin dashboard, and responsive design. Perfect for launching your AI-powered SaaS quickly.',
          features: [
            'AI Content Generation with OpenAI',
            'User Authentication & Authorization',
            'Stripe Subscription Management',
            'Admin Dashboard',
            'Responsive Design',
            'Email Templates',
            'Database Schema',
            'API Routes'
          ],
          tech_stack: ['Next.js', 'TypeScript', 'Supabase', 'Stripe', 'OpenAI', 'Tailwind CSS', 'Framer Motion'],
          category: 'SaaS',
          ipfs_hash: 'QmDemoHash123',
          file_size: 25165824, // 24MB
          preview_images: [
            'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=800',
            'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=800',
            'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800'
          ],
          demo_url: 'https://ai-saas-demo.vercel.app',
          github_url: 'https://github.com/demo/ai-saas-starter',
          licensing_terms: 'standard_commercial' as const,
          status: 'approved' as const,
          version_number: '2.1.0',
          changelog: 'Added OpenAI GPT-4 integration, improved dashboard UI, fixed authentication bugs',
          download_count: 1247,
          average_rating: 4.8,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-20T14:30:00Z',
          published_at: '2024-01-15T12:00:00Z',
          seller: {
            id: 'demo-seller',
            email: 'demo@mvplibrary.dev',
            username: 'demoseller'
          },
          access_tier: 'subscription' // Added access_tier
        };
      }

      return {
        ...data,
        seller: data.profiles,
      };
    } catch (error) {
      console.error('APIService: Error in getMVPById:', error); // Log the error
      throw error;
    }
  }

  static async downloadMVP(mvpId: string, userId: string): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      // 1. Fetch user profile to check download quota
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('downloads_remaining')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.error('Error fetching user profile:', profileError);
        return { success: false, message: 'User profile not found or could not be accessed.' };
      }

      if (userProfile.downloads_remaining <= 0) {
        return { success: false, message: "You have reached your download quota for this month." };
      }

      // 2. Decrement user's download quota
      const newDownloadsRemaining = userProfile.downloads_remaining - 1;
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ downloads_remaining: newDownloadsRemaining })
        .eq('id', userId);

      if (updateProfileError) {
        console.error('Error updating user download quota:', updateProfileError);
        return { success: false, message: 'Failed to update your download quota. Please try again.' };
      }

      // 3. Log the download
      const currentMonthYear = new Date().toISOString().substring(0, 7); // YYYY-MM format
      const { error: insertDownloadError } = await supabase
        .from('downloads')
        .insert({
          user_id: userId,
          mvp_id: mvpId,
          downloaded_at: new Date().toISOString(), // Use current timestamp
          month_year: currentMonthYear,
          // download_ip and user_agent can be captured in a server-side function if needed
        });

      if (insertDownloadError) {
        console.error('Error logging download:', insertDownloadError);
        // Log the error but don't block the download if quota was successfully decremented
      }

      // 4. Get MVP details to construct file path
      const mvp = await APIService.getMVPById(mvpId);
      if (!mvp) {
        return { success: false, message: 'MVP not found.' };
      }

      // Determine the correct storage path for the MVP file.
      // NOTE: This logic is duplicated from MVPUploadService.getMvpStoragePath
      // because MVPUploadService is not in the allowed modification list for this turn.
      // Ideally, this helper function would be public in MVPUploadService and reused.
      let filePath: string;
      const slug = mvp.slug;
      if (mvp.last_synced_github_commit_sha) {
        // The webhook function adds .zip extension
        filePath = `mvps/${slug}/versions/github-${mvp.last_synced_github_commit_sha}/source.zip`;
      } else if (mvp.version_number === '1.0.0' && !mvp.previous_ipfs_hash) {
        filePath = `mvps/${slug}/source`;
      } else {
        filePath = `mvps/${slug}/versions/${mvp.version_number}/source`;
      }

      // 5. Generate a signed URL for the file
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('mvp-files')
        .createSignedUrl(filePath, 60); // URL valid for 60 seconds

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error('Error generating signed URL:', signedUrlError);
        return { success: false, message: 'Failed to generate download link. Please try again.' };
      }

      return { success: true, message: "Download initiated!", filePath: signedUrlData.signedUrl };
    } catch (error: any) {
      console.error('Error in downloadMVP:', error);
      return { success: false, message: error.message || 'An unexpected error occurred during download.' };
    }
  }

  static async getMVPReviews(mvpId: string): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          user:profiles(email)
        `)
        .eq('mvp_id', mvpId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching MVP reviews:', error);
        throw error;
      }

      return data?.map(review => ({
        ...review,
        user: review.user || { email: 'Anonymous' } // Ensure user object is always present
      })) || [];
    } catch (error: any) {
      console.error('Error in getMVPReviews:', error);
      throw error;
    }
  }

  static async submitReview(reviewData: { mvpId: string; userId: string; rating: number; comment: string }): Promise<{ success: boolean; message: string; review?: Review }> {
    try {
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        return { success: false, message: "Rating must be between 1 and 5." };
      }

      // In a real app, insert into Supabase reviews table:
      const { data, error } = await supabase.from('reviews').insert([
        {
          mvp_id: reviewData.mvpId,
          user_id: reviewData.userId,
          rating: reviewData.rating,
          review_text: reviewData.comment,
          is_verified_buyer: true // Determine based on actual purchase history
        }
      ]).select().single();

      if (error) throw error;

      // Update MVP average rating
      await supabase.rpc('update_mvp_rating', { mvp_id_param: reviewData.mvpId });

      return { success: true, message: "Review submitted successfully!", review: data };
    } catch (error: any) {
      console.error('Error in submitReview:', error);
      return { success: false, message: error.message || 'Failed to submit review.' };
    }
  }

  static async getUserDownloads(userId: string): Promise<Download[]> {
    try {
      // For beta user, return mock data
      if (userId === 'beta-user-123') {
        return [
          {
            id: 'mock-download-1',
            user_id: 'beta-user-123',
            mvp_id: 'demo-mvp-1',
            downloaded_at: '2024-06-20T10:00:00Z',
            month_year: '2024-06',
            mvps: {
              id: 'demo-mvp-1',
              title: 'AI-Powered SaaS Starter Kit',
              slug: 'ai-saas-starter-kit',
              preview_images: ['https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=100'],
            },
          },
          {
            id: 'mock-download-2',
            user_id: 'beta-user-123',
            mvp_id: 'demo-mvp-2', // Assuming another demo MVP
            downloaded_at: '2024-06-15T14:30:00Z',
            month_year: '2024-06',
            mvps: {
              id: 'demo-mvp-2',
              title: 'E-commerce Platform',
              slug: 'ecommerce-platform',
              preview_images: ['https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=100'],
            },
          },
        ];
      }

      const { data, error } = await supabase
        .from('downloads')
        .select(`
          *,
          mvps(id, title, slug, preview_images)
        `)
        .eq('user_id', userId)
        .order('downloaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching user downloads:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getUserDownloads:', error);
      throw error;
    }
  }

  static async createStripeConnectAccountLink(userId: string): Promise<{ success: boolean; accountLinkUrl?: string; message?: string }> {
    try {
      // For beta user, simulate success
      if (userId === 'beta-user-123') {
        return { success: true, accountLinkUrl: 'https://connect.stripe.com/oauth/v2/authorize?response_type=code&client_id=ca_mock_beta&scope=read_write' };
      }

      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: {
          user_id: userId,
          return_url: `${origin}/payouts?stripe_connect=success`,
          refresh_url: `${origin}/payouts?stripe_connect=refresh`,
        },
      });

      if (error) {
        console.error('Error invoking create-stripe-connect-account function:', error);
        return { success: false, message: error.message };
      }

      if (data?.account_link_url) {
        return { success: true, accountLinkUrl: data.account_link_url };
      } else {
        return { success: false, message: data?.error || 'Failed to get Stripe Connect account link URL.' };
      }
    } catch (error: any) {
      console.error('Error in createStripeConnectAccountLink:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }

  static async getSellerPayouts(sellerId: string): Promise<any[] | null> {
    try {
      // For beta user, return mock data (handled in PayoutsPage for now)
      if (sellerId === 'beta-user-123') {
        return null; // PayoutsPage will use its own mock data
      }

      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seller payouts:', error);
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error in getSellerPayouts:', error);
      throw error;
    }
  }

  static async getProfileByUsername(username: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          profile_picture_url,
          website_url,
          social_links,
          github_username,
          created_at,
          is_seller_approved
        `)
        .eq('username', username)
        .single();

      if (error) {
        console.error('Error fetching profile by username:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error in getProfileByUsername:', error);
      throw error;
    }
  }
}

// GitHub Integration Methods
export class GitHubService {
  /**
   * Helper to get GitHub App installation token
   */
  private static async getInstallationToken(installationId: number): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('get-github-app-token', {
        body: { installation_id: installationId },
      });

      if (error) {
        console.error('Error invoking get-github-app-token function:', error);
        throw new Error('Failed to get GitHub App installation token');
      }
      if (data?.token) {
        return data.token;
      } else {
        console.warn('get-github-app-token did not return a token.');
        return null;
      }
    } catch (error: any) {
      console.error('Failed to fetch GitHub App installation token:', error);
      return null;
    }
  }

  /**
   * Link a GitHub repository to an MVP
   * This function now also returns the GitHub App installation URL.
   */
  static async linkGitHubRepository(
    mvpId: string, 
    userId: string, // Add userId parameter
    owner: string, 
    repoName: string,
    webhookSecret: string // Add webhookSecret parameter
  ): Promise<{ success: boolean; message: string; githubAppInstallUrl?: string }> {
    try {
      // Validate GitHub repository exists (using unauthenticated call first)
      const repoValidation = await this.validateGitHubRepository(owner, repoName, userId);
      if (!repoValidation.success) {
        return { success: false, message: repoValidation.message };
      }

      // Update MVP with GitHub repository information and webhook secret
      // Note: github_app_installation_id will be set by the callback function
      const { error } = await supabase
        .from('mvps')
        .update({
          github_repo_owner: owner,
          github_repo_name: repoName,
          github_webhook_secret: webhookSecret, // Store the webhook secret
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);

      if (error) {
        console.error('Error linking GitHub repository:', error);
        return { success: false, message: 'Failed to link GitHub repository' };
      }

      // Construct GitHub App installation URL
      // The VITE_GITHUB_APP_SLUG needs to be configured in your .env file
      const githubAppSlug = import.meta.env.VITE_GITHUB_APP_SLUG;
      if (!githubAppSlug) {
        console.error('VITE_GITHUB_APP_SLUG is not set in environment variables.');
        return { success: false, message: 'GitHub App slug not configured.' };
      }
      
      // The 'state' parameter is crucial for linking the installation back to the user
      const installUrl = `https://github.com/apps/${githubAppSlug}/installations/new?state=${userId}`; // Changed from mvpId to userId

      return { 
        success: true, 
        message: 'GitHub repository linked successfully! Please install the GitHub App to enable full integration.',
        githubAppInstallUrl: installUrl
      };
    } catch (error: any) {
      console.error('Error in linkGitHubRepository:', error);
      return { success: false, message: error.message || 'Failed to link GitHub repository' };
    }
  }

  /**
   * Unlink a GitHub repository from an MVP
   */
  static async unlinkGitHubRepository(mvpId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('mvps')
        .update({
          github_repo_owner: null,
          github_repo_name: null,
          last_synced_github_commit_sha: null,
          github_webhook_secret: null, // Clear the webhook secret
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);

      if (error) {
        console.error('Error unlinking GitHub repository:', error);
        return { success: false, message: 'Failed to unlink GitHub repository' };
      }

      return { success: true, message: 'GitHub repository unlinked successfully' };
    } catch (error: any) {
      console.error('Error in unlinkGitHubRepository:', error);
      return { success: false, message: error.message || 'Failed to unlink GitHub repository' };
    }
  }

  /**
   * Validate that a GitHub repository exists and is accessible.
   * Can use installation token for private repos.
   */
  static async validateGitHubRepository(
    owner: string, 
    repoName: string,
    userId?: string // Optional userId to fetch installation token from profiles
  ): Promise<{ success: boolean; message: string; repoData?: any }> {
    let headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MVP-Library-Platform'
    };

    if (userId) { // Changed from mvpId to userId
      const { data: profile, error: profileFetchError } = await supabase // Changed from mvp to profile
        .from('profiles') // Changed from mvps to profiles
        .select('github_app_installation_id')
        .eq('id', userId) // Changed from mvpId to userId
        .single();

      if (profileFetchError || !profile || !profile.github_app_installation_id) { // Changed from mvp to profile
        // If profile or installation ID not found, proceed without token (for public repos)
        console.warn(`No GitHub App installation ID found for user ${userId}. Attempting public access.`); // Changed from MVP to user
      } else {
        const token = await this.getInstallationToken(profile.github_app_installation_id); // Changed from mvp to profile
        if (token) {
          headers = { ...headers, 'Authorization': `Bearer ${token}` };
        } else {
          console.warn(`Failed to get installation token for user ${userId}. Attempting public access.`); // Changed from MVP to user
        }
      }
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
        headers: headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { 
            success: false, 
            message: 'Repository not found. Please check the owner and repository name.' 
          };
        } else if (response.status === 403) {
          return { 
            success: false, 
            message: 'Repository is private or access is forbidden. Ensure the GitHub App is installed and has access.' 
          };
        } else {
          return { 
            success: false, 
            message: `Failed to access GitHub repository: ${response.statusText}` 
          };
        }
      }

      const repoData = await response.json();
      return { 
        success: true, 
        message: 'Repository validated successfully', 
        repoData 
      };
    } catch (error: any) {
      console.error('Error validating GitHub repository:', error);
      return { 
        success: false, 
        message: 'Network error while validating repository. Please check your connection.' 
      };
    }
  }

  /**
   * Get the latest release or commit information from a GitHub repository.
   * Can use installation token for private repos.
   */
  static async getLatestRepositoryInfo(
    owner: string, 
    repoName: string,
    userId?: string // Optional userId to fetch installation token
  ): Promise<{ success: boolean; data?: any; message: string }> {
    let headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MVP-Library-Platform'
    };

    if (userId) { // Changed from mvpId to userId
      const { data: profile, error: profileFetchError } = await supabase // Changed from mvp to profile
        .from('profiles') // Changed from mvps to profiles
        .select('github_app_installation_id')
        .eq('id', userId) // Changed from mvpId to userId
        .single();

      if (profileFetchError || !profile || !profile.github_app_installation_id) { // Changed from mvp to profile
        console.warn(`No GitHub App installation ID found for user ${userId}. Attempting public access.`); // Changed from MVP to user
      } else {
        const token = await this.getInstallationToken(profile.github_app_installation_id); // Changed from mvp to profile
        if (token) {
          headers = { ...headers, 'Authorization': `Bearer ${token}` };
        } else {
          console.warn(`Failed to get installation token for user ${userId}. Attempting public access.`); // Changed from MVP to user
        }
      }
    }

    try {
      // First try to get the latest release
      const releaseResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/releases/latest`,
        { headers: headers }
      );

      if (releaseResponse.ok) {
        const releaseData = await releaseResponse.json();
        return {
          success: true,
          data: {
            type: 'release',
            version: releaseData.tag_name,
            name: releaseData.name,
            body: releaseData.body,
            published_at: releaseData.published_at,
            commit_sha: releaseData.target_commitish,
            zipball_url: releaseData.zipball_url
          },
          message: 'Latest release found'
        };
      }

      // If no releases, get the latest commit from default branch
      const commitsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/commits`,
        { headers: headers }
      );

      if (!commitsResponse.ok) {
        return {
          success: false,
          message: `Failed to fetch repository information: ${commitsResponse.statusText}`
        };
      }

      const commitsData = await commitsResponse.json();
      if (!commitsData || commitsData.length === 0) {
        return {
          success: false,
          message: 'No commits found in repository.'
        };
      }
      const latestCommit = commitsData[0];

      return {
        success: true,
        data: {
          type: 'commit',
          commit_sha: latestCommit.sha,
          message: latestCommit.commit.author.name,
          author: latestCommit.commit.author.name,
          date: latestCommit.commit.author.date,
          archive_url: `https://api.github.com/repos/${owner}/${repoName}/zipball/${latestCommit.sha}`
        },
        message: 'Latest commit found'
      };
    } catch (error: any) {
      console.error('Error getting repository info:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch repository information'
      };
    }
  }

  /**
   * Completes the GitHub App installation process by calling the Edge Function.
   */
  static async completeGitHubAppInstallation(
    code: string,
    installationId: number,
    userId: string // Changed from mvpId to userId
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-github-app-installation', {
        body: {
          code: code,
          installation_id: installationId,
          state: userId, // 'state' is used to pass the userId back
        },
      });

      if (error) {
        console.error('Error invoking create-github-app-installation function:', error);
        return { success: false, message: error.message };
      }

      if (data?.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data?.error || 'Failed to complete GitHub App installation.' };
      }
    } catch (error: any) {
      console.error('Error in completeGitHubAppInstallation:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }

  /**
   * Initiates the GitHub OAuth flow by calling the Edge Function.
   */
  static async initiateGitHubOAuth(userId: string): Promise<{ success: boolean; githubAuthUrl?: string; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('initiate-github-oauth', {
        body: { user_id: userId },
      });

      if (error) {
        console.error('Error invoking initiate-github-oauth function:', error);
        return { success: false, message: error.message };
      }

      if (data?.github_auth_url) {
        return { success: true, githubAuthUrl: data.github_auth_url, message: 'GitHub OAuth initiated successfully.' };
      } else {
        return { success: false, message: data?.error || 'Failed to get GitHub OAuth URL.' };
      }
    } catch (error: any) {
      console.error('Error in initiateGitHubOAuth:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }
}

/**
 * DeploymentService handles operations related to deploying MVPs to Netlify
 * via GitHub integration. It creates GitHub repositories, pushes MVP code,
 * and triggers the external Railway worker for deployment processing.
 */
export class DeploymentService {
  /**
   * Starts the deployment process by creating a deployment record and initiating
   * the GitHub repository creation process.
   */
  static async startDeployment(
    userId: string,
    mvpId: string,
    repoName: string
  ): Promise<{
    success: boolean;
    message?: string;
    deployment_id?: string;
    github_auth_url?: string;
  }> {
    try {
      // Step 1: Get the storage path for the MVP
      const mvp = await APIService.getMVPById(mvpId);
      if (!mvp) {
        throw new Error('MVP not found');
      }

      // Get the proper storage path using MVPUploadService
      const storagePath = MVPUploadService.getMvpStoragePath(mvp);

      // Step 2: Create a deployment record in Supabase
      const { data: deployment, error } = await supabase
        .from('deployments')
        .insert({
          user_id: userId,
          mvp_id: mvpId,
          storage_path: storagePath,
          repo_name: repoName,
          status: 'initializing',
          branch: 'main', // Default branch
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating deployment record:', error);
        throw new Error('Failed to create deployment record');
      }

      // Step 3: Check if user has a GitHub token
      const { data: githubToken, error: tokenError } = await supabase
        .from('user_oauth_tokens')
        .select('access_token')
        .eq('user_id', userId)
        .eq('provider', 'github')
        .maybeSingle();

      if (tokenError) {
        console.error('Error checking GitHub token:', tokenError);
        throw new Error('Failed to verify GitHub authentication');
      }

      // Step 4: If no GitHub token, redirect to GitHub OAuth
      if (!githubToken || !githubToken.access_token) {
        console.log('No GitHub token found, initiating GitHub OAuth flow');
        
        // Call the initiate-buyer-github-oauth Edge Function
        const { data: oauthData, error: oauthError } = await supabase.functions.invoke(
          'initiate-buyer-github-oauth',
          {
            body: {
              user_id: userId,
              mvp_id: mvpId,
            },
          }
        );

        if (oauthError || !oauthData || !oauthData.github_auth_url) {
          console.error('Error initiating GitHub OAuth:', oauthError || 'No auth URL received');
          throw new Error('Failed to initiate GitHub authentication');
        }

        // Return the GitHub auth URL for redirection
        return {
          success: true,
          message: 'GitHub authentication required',
          deployment_id: deployment.id,
          github_auth_url: oauthData.github_auth_url,
        };
      }

      // Step 5: Create GitHub repository (only create, not push MVP yet)
      console.log('Creating GitHub repository...');
      const { data: repoData, error: repoError } = await supabase.functions.invoke(
        'create-buyer-repo-and-push-mvp',
        {
          body: {
            user_id: userId,
            mvp_id: mvpId,
            deployment_id: deployment.id,
            repo_name: repoName,
            create_only: true, // Only create the repo, don't push the code yet
          },
        }
      );

      if (repoError || !repoData.success) {
        console.error('Error creating GitHub repository:', repoError || repoData.error);
        throw new Error(repoData?.error || 'Failed to create GitHub repository');
      }

      // Step 6: Trigger the Railway worker
      console.log('Triggering Railway worker for deployment:', deployment.id);
      const workerResponse = await fetch('https://startifi-worker-production.up.railway.app/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deployment_id: deployment.id,
        }),
      });

      if (!workerResponse.ok) {
        const errorData = await workerResponse.text();
        console.error('Railway worker error:', errorData);
        throw new Error('Failed to initiate deployment process');
      }

      const workerData = await workerResponse.json();
      console.log('Railway worker response:', workerData);

      // Step 7: Return success
      return {
        success: true,
        message: 'Deployment initiated successfully',
        deployment_id: deployment.id,
      };
    } catch (error: any) {
      console.error('Error in startDeployment:', error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred during deployment',
      };
    }
  }

  /**
   * Gets the current status of a deployment.
   */
  static async getDeploymentStatus(
    deploymentId: string
  ): Promise<{
    status: string;
    error_message?: string;
    github_repo_url?: string;
    netlify_site_url?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('deployments')
        .select('*')
        .eq('id', deploymentId)
        .single();

      if (error) {
        throw new Error('Failed to fetch deployment status');
      }

      if (!data) {
        throw new Error('Deployment not found');
      }

      return {
        status: data.status,
        error_message: data.error_message,
        github_repo_url: data.github_repo_url,
        netlify_site_url: data.netlify_site_url,
      };
    } catch (error: any) {
      console.error('Error in getDeploymentStatus:', error);
      return {
        status: 'error',
        error_message: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Gets all deployments for a user.
   */
  static async getUserDeployments(userId: string): Promise<{
    success: boolean;
    deployments?: any[];
    message?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('deployments')
        .select(`
          *,
          mvps(id, title, preview_images)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Failed to fetch deployments');
      }

      return {
        success: true,
        deployments: data,
      };
    } catch (error: any) {
      console.error('Error in getUserDeployments:', error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Initiates the GitHub OAuth flow for a general purpose (not tied to a specific MVP deployment).
   */
  static async initiateGeneralGitHubAuth(userId: string): Promise<{
    success: boolean;
    github_auth_url?: string;
    message?: string;
  }> {
    try {
      // Call the initiate-buyer-github-oauth Edge Function
      const { data, error } = await supabase.functions.invoke(
        'initiate-buyer-github-oauth',
        {
          body: {
            user_id: userId,
          },
        }
      );

      if (error || !data || !data.github_auth_url) {
        throw new Error(error?.message || 'Failed to initiate GitHub authentication');
      }

      return {
        success: true,
        github_auth_url: data.github_auth_url,
      };
    } catch (error: any) {
      console.error('Error in initiateGeneralGitHubAuth:', error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Completes the GitHub authentication flow.
   */
  static async completeGitHubAuth(
    code: string,
    state: string
  ): Promise<{
    success: boolean;
    github_username?: string;
    mvp_id?: string;
    message?: string;
  }> {
    try {
      // Call the handle-buyer-github-callback Edge Function
      const { data, error } = await supabase.functions.invoke(
        'handle-buyer-github-callback',
        {
          body: {
            code,
            state,
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        github_username: data.github_username,
        mvp_id: data.mvp_id,
        message: 'GitHub authentication completed successfully',
      };
    } catch (error: any) {
      console.error('Error in completeGitHubAuth:', error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
      };
    }
  }
}

/**
 * Service for handling notifications
 */
export class NotificationService {
  /**
   * Get notifications for a user
   * @param userId The ID of the user
   * @param readStatus Optional filter by read status
   */
  static async getNotifications(userId: string, readStatus?: boolean) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (readStatus !== undefined) {
        query = query.eq('read', readStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }
      return data || [];
    } catch (error: any) {
      console.error('Error in getNotifications:', error);
      throw error;
    }
  }

  /**
   * Get the count of unread notifications for a user
   * @param userId The ID of the user
   */
  static async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error fetching unread notification count:', error);
        throw error;
      }
      return count || 0;
    } catch (error: any) {
      console.error('Error in getUnreadNotificationCount:', error);
      throw error;
    }
  }

  /**
   * Mark a specific notification as read
   * @param notificationId The ID of the notification to mark as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error: any) {
      console.error('Error in markNotificationAsRead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark all notifications for a user as read
   * @param userId The ID of the user
   */
  static async markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error: any) {
      console.error('Error in markAllNotificationsAsRead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new notification
   * @param notificationData The data for the new notification
   */
  static async createNotification(notificationData: {
    user_id: string;
    type: string;
    message: string;
    link?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([notificationData]);

      if (error) {
        console.error('Error creating notification:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error: any) {
      console.error('Error in createNotification:', error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Service for handling refund requests
 */
export class RefundService {
  /**
   * Get refund requests for a user
   * @param userId The ID of the user
   */
  static async getUserRefundRequests(userId: string): Promise<RefundRequest[]> {
    try {
      const { data, error } = await supabase
        .from('refund_requests')
        .select(`
          *,
          user:profiles(email, username),
          subscription:subscriptions(plan_type, stripe_subscription_id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching refund requests:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getUserRefundRequests:', error);
      throw error;
    }
  }

  /**
   * Submit a new refund request
   * @param refundData The data for the new refund request
   */
  static async submitRefundRequest(refundData: {
    userId: string;
    subscriptionId: string;
    reason: string;
    amountRequested: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('refund_requests')
        .insert([{
          user_id: refundData.userId,
          subscription_id: refundData.subscriptionId,
          reason: refundData.reason,
          amount_requested: refundData.amountRequested,
          status: 'pending'
        }]);

      if (error) {
        console.error('Error submitting refund request:', error);
        throw error;
      }

      // Create notification for admins (you'd need to fetch admin users)
      try {
        // In a real application, you would fetch admin user IDs and notify them
        // For now, just log the action
        console.log('Refund request created, would notify admins');
      } catch (notifyError) {
        console.error('Error creating notification:', notifyError);
        // Don't fail the operation if notification fails
      }

      return { 
        success: true, 
        message: 'Refund request submitted successfully. Our team will review your request within 2-3 business days.' 
      };
    } catch (error: any) {
      console.error('Error in submitRefundRequest:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to submit refund request. Please try again.' 
      };
    }
  }
}

/**
 * Service for handling disputes
 */
export class DisputeService {
  /**
   * Get disputes for a user
   * @param userId The ID of the user
   */
  static async getUserDisputes(userId: string): Promise<Dispute[]> {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          buyer:profiles!disputes_buyer_id_fkey(email, username),
          seller:profiles!disputes_seller_id_fkey(email, username),
          mvp:mvps(title, slug)
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('opened_at', { ascending: false });

      if (error) {
        console.error('Error fetching disputes:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getUserDisputes:', error);
      throw error;
    }
  }

  /**
   * Get a specific dispute by ID
   * @param disputeId The ID of the dispute
   */
  static async getDisputeById(disputeId: string): Promise<Dispute | null> {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          buyer:profiles!disputes_buyer_id_fkey(email, username),
          seller:profiles!disputes_seller_id_fkey(email, username),
          mvp:mvps(title, slug)
        `)
        .eq('id', disputeId)
        .single();

      if (error) {
        console.error('Error fetching dispute details:', error);
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error in getDisputeById:', error);
      throw error;
    }
  }

  /**
   * Submit a new dispute
   * @param disputeData The data for the new dispute
   */
  static async submitDispute(disputeData: {
    buyerId: string;
    sellerId: string;
    mvpId: string;
    reason: string;
    details: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('disputes')
        .insert([{
          buyer_id: disputeData.buyerId,
          seller_id: disputeData.sellerId,
          mvp_id: disputeData.mvpId,
          reason: disputeData.reason,
          details: disputeData.details,
          status: 'open'
        }]);

      if (error) {
        console.error('Error submitting dispute:', error);
        throw error;
      }

      // Notify the seller about the dispute
      try {
        await NotificationService.createNotification({
          user_id: disputeData.sellerId,
          type: 'new_dispute',
          message: `A buyer has opened a dispute regarding one of your MVPs. Reason: ${disputeData.reason}`,
          link: '/disputes'
        });
      } catch (notifyError) {
        console.error('Error creating notification:', notifyError);
        // Don't fail the operation if notification fails
      }

      return { 
        success: true, 
        message: 'Dispute submitted successfully. Our team will review your case within 2-3 business days.' 
      };
    } catch (error: any) {
      console.error('Error in submitDispute:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to submit dispute. Please try again.' 
      };
    }
  }
}

/**
 * Service for handling marketing functions
 */
export class MarketingService {
  /**
   * Process a lead capture from the modal
   * @param email The email address
   * @param agreedToTerms Whether they agreed to the privacy terms
   */
  static async processLeadCapture(email: string, agreedToTerms: boolean): Promise<{ success: boolean; message: string }> {
    try {
      if (!email) {
        return { success: false, message: 'Email is required' };
      }
      
      if (!agreedToTerms) {
        return { success: false, message: 'You must agree to the privacy policy' };
      }
      
      // Call the Edge Function to process the lead
      const { data, error } = await supabase.functions.invoke('process-lead-capture', {
        body: {
          email,
          source: 'lead_modal',
          agreed_to_terms: agreedToTerms,
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) {
        console.error('Error invoking process-lead-capture function:', error);
        return { success: false, message: 'Failed to process subscription. Please try again.' };
      }
      
      if (data?.success) {
        return { success: true, message: 'Thank you! You\'ve been subscribed to our newsletter.' };
      } else {
        return { success: false, message: data?.error || 'Failed to subscribe. Please try again.' };
      }
    } catch (error: any) {
      console.error('Error in processLeadCapture:', error);
      return { success: false, message: error.message || 'An unexpected error occurred' };
    }
  }
}