// src/lib/api.ts
import { supabase } from './supabase';
import type { MVP, Review, Subscription, Download } from '../types';
import { MVPUploadService } from './mvpUpload'; // This import is already present
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
  }) {
    try {
      let query = supabase
        .from('mvps')
        .select(`
          *,
          profiles!mvps_seller_id_fkey(id, email)
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
            email: 'demo@mvplibrary.dev'
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
          profiles!mvps_seller_id_fkey(id, email)
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
            email: 'demo@mvplibrary.dev'
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

      // Simulate database insert
      console.log('Simulating review submission:', reviewData);

      const mockReview: Review = {
        id: `mock-review-${Date.now()}`,
        mvp_id: reviewData.mvpId,
        user_id: reviewData.userId,
        rating: reviewData.rating,
        review_text: reviewData.comment,
        created_at: new Date().toISOString(),
        is_verified_buyer: true, // Simulate verified buyer
        user: { email: 'mockuser@example.com' } // Simulate user data
      };

      // In a real app, insert into Supabase reviews table:
      // const { data, error } = await supabase.from('reviews').insert([
      //   {
      //     mvp_id: reviewData.mvpId,
      //     user_id: reviewData.userId,
      //     rating: reviewData.rating,
      //     review_text: reviewData.comment,
      //     is_verified_buyer: true // Determine based on actual purchase history
      //   }
      // ]).select().single();

      // if (error) throw error;

      return { success: true, message: "Review submitted successfully!", review: mockReview };
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
          // github_app_installation_id: null, // This column is now in profiles, so remove this line
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

// Deployment Service for one-click deploy
export class DeploymentService {
  /**
   * Start the deployment process by initiating GitHub OAuth
   */
  static async startDeployment(userId: string, mvpId: string): Promise<{
    success: boolean;
    message: string;
    deployment_id?: string;
    github_auth_url?: string;
  }> {
    try {
      // First create a deployment record
      const { data: deploymentData, error: deploymentError } = await supabase
        .from('deployments')
        .insert({
          user_id: userId,
          mvp_id: mvpId,
          status: 'initializing',
        })
        .select()
        .single();

      if (deploymentError || !deploymentData) {
        console.error('Error creating deployment record:', deploymentError);
        return { success: false, message: 'Failed to create deployment record' };
      }

      // Check if user already has GitHub token
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_oauth_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'github')
        .maybeSingle();

      if (tokenError) {
        console.error('Error checking GitHub token:', tokenError);
        return { success: false, message: 'Failed to check GitHub authentication status' };
      }

      if (tokenData) {
        // User already has GitHub token, we can skip directly to repo creation
        return {
          success: true,
          message: 'Deployment initialized, GitHub authentication already exists',
          deployment_id: deploymentData.id,
        };
      }

      // Initiate GitHub OAuth flow
      const { data, error } = await supabase.functions.invoke('initiate-buyer-github-oauth', {
        body: {
          user_id: userId,
          mvp_id: mvpId,
        },
      });

      if (error) {
        console.error('Error initiating GitHub OAuth:', error);
        return { success: false, message: 'Failed to initiate GitHub authentication' };
      }

      return {
        success: true,
        message: 'Deployment initialized, please authenticate with GitHub',
        deployment_id: deploymentData.id,
        github_auth_url: data.github_auth_url,
      };
    } catch (error: any) {
      console.error('Error in startDeployment:', error);
      return { success: false, message: error.message || 'Failed to start deployment process' };
    }
  }

  /**
   * Complete the GitHub OAuth process and create repository
   */
  static async completeGitHubAuth(code: string, state: string): Promise<{
    success: boolean;
    message: string;
    github_username?: string;
    mvp_id?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('handle-buyer-github-callback', {
        body: { code, state },
      });

      if (error) {
        console.error('Error completing GitHub authentication:', error);
        return { success: false, message: 'Failed to complete GitHub authentication' };
      }

      return {
        success: true,
        message: 'GitHub authentication completed successfully',
        github_username: data.github_username,
        mvp_id: data.mvp_id,
      };
    } catch (error: any) {
      console.error('Error in completeGitHubAuth:', error);
      return { success: false, message: error.message || 'Failed to complete GitHub authentication' };
    }
  }

  /**
   * Create GitHub repository and push MVP code
   */
  static async createRepoAndPushMVP(userId: string, mvpId: string, deploymentId: string, repoName: string): Promise<{
    success: boolean;
    message: string;
    github_repo_url?: string;
    github_username?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-buyer-repo-and-push-mvp', {
        body: {
          user_id: userId,
          mvp_id: mvpId,
          deployment_id: deploymentId,
          repo_name: repoName,
        },
      });

      if (error) {
        console.error('Error creating GitHub repository:', error);
        return { success: false, message: 'Failed to create GitHub repository' };
      }

      return {
        success: true,
        message: 'GitHub repository created successfully',
        github_repo_url: data.github_repo_url,
        github_username: data.github_username,
      };
    } catch (error: any) {
      console.error('Error in createRepoAndPushMVP:', error);
      return { success: false, message: error.message || 'Failed to create GitHub repository' };
    }
  }

  /**
   * Initiate Netlify OAuth flow
   */
  static async initiateNetlifyAuth(userId: string, deploymentId: string, githubRepoUrl: string): Promise<{
    success: boolean;
    message: string;
    netlify_auth_url?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('initiate-netlify-oauth', {
        body: {
          user_id: userId,
          deployment_id: deploymentId,
          github_repo_url: githubRepoUrl,
        },
      });

      if (error) {
        console.error('Error initiating Netlify OAuth:', error);
        return { success: false, message: 'Failed to initiate Netlify authentication' };
      }

      return {
        success: true,
        message: 'Netlify authentication initiated successfully',
        netlify_auth_url: data.netlify_auth_url,
      };
    } catch (error: any) {
      console.error('Error in initiateNetlifyAuth:', error);
      return { success: false, message: error.message || 'Failed to initiate Netlify authentication' };
    }
  }

  /**
   * Complete Netlify OAuth and deploy site
   */
  static async completeNetlifyAuth(code: string, state: string): Promise<{
    success: boolean;
    message: string;
    netlify_site_url?: string;
    netlify_site_name?: string;
    deployment_id?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('handle-netlify-callback', {
        body: { code, state },
      });

      if (error) {
        console.error('Error completing Netlify authentication:', error);
        return { success: false, message: 'Failed to complete Netlify authentication' };
      }

      return {
        success: true,
        message: 'Netlify site deployed successfully',
        netlify_site_url: data.site_url,
        netlify_site_name: data.netlify_site_name,
        deployment_id: data.deployment_id,
      };
    } catch (error: any) {
      console.error('Error in completeNetlifyAuth:', error);
      return { success: false, message: error.message || 'Failed to complete Netlify authentication' };
    }
  }

  /**
   * Get deployment status
   */
  static async getDeploymentStatus(deploymentId: string): Promise<{
    success: boolean;
    deployment?: any;
    message?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('deployments')
        .select('*')
        .eq('id', deploymentId)
        .single();

      if (error) {
        console.error('Error fetching deployment status:', error);
        return { success: false, message: 'Failed to fetch deployment status' };
      }

      return {
        success: true,
        deployment: data,
      };
    } catch (error: any) {
      console.error('Error in getDeploymentStatus:', error);
      return { success: false, message: error.message || 'Failed to fetch deployment status' };
    }
  }

  /**
   * Initiate GitHub OAuth flow for general account connection (not tied to a specific MVP)
   */
  static async initiateGeneralGitHubAuth(userId: string): Promise<{
    success: boolean;
    message: string;
    github_auth_url?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('initiate-buyer-github-oauth', {
        body: {
          user_id: userId,
          // No mvp_id here since this is a general connection
        },
      });

      if (error) {
        console.error('Error initiating general GitHub OAuth:', error);
        return { success: false, message: 'Failed to initiate GitHub authentication' };
      }

      return {
        success: true,
        message: 'GitHub authentication initiated successfully',
        github_auth_url: data.github_auth_url,
      };
    } catch (error: any) {
      console.error('Error in initiateGeneralGitHubAuth:', error);
      return { success: false, message: error.message || 'Failed to initiate GitHub authentication' };
    }
  }

  /**
   * Get user deployments
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
          mvps(id, title, slug, preview_images)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user deployments:', error);
        return { success: false, message: 'Failed to fetch deployments' };
      }

      return {
        success: true,
        deployments: data,
      };
    } catch (error: any) {
      console.error('Error in getUserDeployments:', error);
      return { success: false, message: error.message || 'Failed to fetch deployments' };
    }
  }
}
