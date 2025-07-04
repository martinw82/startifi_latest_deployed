// src/lib/api.ts
import { supabase } from './supabase';
import type {
  MVP,
  Review,
  Download,
  Notification,
  RefundRequest,
  Dispute,
  User,
  NewsletterSubscriber,
} from '../types';

export class APIService {
  static async getMVPs(filters?: {
    search?: string;
    category?: string;
    techStack?: string[];
    minPrice?: number;
    maxPrice?: number;
    licensingTerms?: string;
    sortBy?: 'published_at' | 'download_count' | 'average_rating';
    page?: number;
    limit?: number;
  }): Promise<{ mvps: MVP[]; total: number }> {
    let query = supabase.from('mvps').select('*, seller:seller_id(id, email, username)', { count: 'exact' });

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,tagline.ilike.%${filters.search}%`);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.techStack && filters.techStack.length > 0) {
      query = query.contains('tech_stack', filters.techStack);
    }
    if (filters?.minPrice) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters?.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters?.licensingTerms) {
      query = query.eq('licensing_terms', filters.licensingTerms);
    }

    // Always filter by approved status for public listing
    query = query.eq('status', 'approved');

    if (filters?.sortBy) {
      query = query.order(filters.sortBy, { ascending: false });
    } else {
      query = query.order('published_at', { ascending: false });
    }

    if (filters?.page !== undefined && filters?.limit) {
      const start = filters.page * filters.limit;
      const end = start + filters.limit - 1;
      query = query.range(start, end);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching MVPs:', error);
      return { mvps: [], total: 0 };
    }

    return { mvps: data || [], total: count || 0 };
  }

  static async getMVPById(mvpId: string): Promise<MVP | null> {
    const { data, error } = await supabase
      .from('mvps')
      .select('*, seller:seller_id(id, email, username)')
      .eq('id', mvpId)
      .single();

    if (error) {
      console.error('Error fetching MVP by ID:', error);
      return null;
    }
    return data;
  }

  static async downloadMVP(
    mvpId: string,
    userId: string
  ): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      // Fetch user profile to check download quota
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('downloads_remaining')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.error('Error fetching user profile:', profileError);
        return { success: false, message: 'User profile not found.' };
      }

      if (userProfile.downloads_remaining <= 0) {
        return {
          success: false,
          message: 'You have reached your download quota. Please upgrade your plan.',
        };
      }

      // Decrement download quota
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ downloads_remaining: userProfile.downloads_remaining - 1 })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating download quota:', updateError);
        return { success: false, message: 'Failed to update download quota.' };
      }

      // Record the download
      const { error: downloadRecordError } = await supabase.from('downloads').insert([
        {
          user_id: userId,
          mvp_id: mvpId,
          month_year: new Date().toISOString().substring(0, 7), // YYYY-MM format
        },
      ]);

      if (downloadRecordError) {
        console.error('Error recording download:', downloadRecordError);
        // Optionally, revert quota if recording fails
        return { success: false, message: 'Failed to record download.' };
      }

      // Increment MVP download count
      const { error: incrementError } = await supabase.rpc('increment_mvp_downloads', {
        mvp_id_param: mvpId,
      });

      if (incrementError) {
        console.error('Error incrementing MVP download count:', incrementError);
        // Non-critical error, but log it
      }

      // In a real scenario, you would generate a signed URL for the actual file
      // For now, return a mock path
      const mockFilePath = `/downloads/mvp_${mvpId}_v1.zip`;
      return {
        success: true,
        message: 'Download initiated!',
        filePath: mockFilePath,
      };
    } catch (error: any) {
      console.error('Error in downloadMVP:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }

  static async getMVPReviews(mvpId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, user:user_id(email)')
      .eq('mvp_id', mvpId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching MVP reviews:', error);
      return [];
    }
    return data || [];
  }

  static async submitReview(reviewData: {
    mvpId: string;
    userId: string;
    rating: number;
    comment: string;
  }): Promise<{ success: boolean; message: string; review?: Review }> {
    try {
      // Check if user has downloaded this MVP
      const { data: download, error: downloadError } = await supabase
        .from('downloads')
        .select('id')
        .eq('user_id', reviewData.userId)
        .eq('mvp_id', reviewData.mvpId)
        .maybeSingle();

      const isVerifiedBuyer = !!download;

      const { data, error } = await supabase
        .from('reviews')
        .insert([
          {
            mvp_id: reviewData.mvpId,
            user_id: reviewData.userId,
            rating: reviewData.rating,
            review_text: reviewData.comment,
            is_verified_buyer: isVerifiedBuyer,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error submitting review:', error);
        return { success: false, message: error.message || 'Failed to submit review.' };
      }

      // Update MVP average rating
      const { error: updateRatingError } = await supabase.rpc('update_mvp_rating', {
        mvp_id_param: reviewData.mvpId,
      });

      if (updateRatingError) {
        console.error('Error updating MVP average rating:', updateRatingError);
        // Non-critical error, but log it
      }

      return { success: true, message: 'Review submitted successfully!', review: data };
    } catch (error: any) {
      console.error('Error in submitReview:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }

  static async getUserDownloads(userId: string): Promise<Download[]> {
    const { data, error } = await supabase
      .from('downloads')
      .select('*, mvps(id, title, slug, preview_images)')
      .eq('user_id', userId)
      .order('downloaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching user downloads:', error);
      return [];
    }
    return data || [];
  }

  static async getTotalMVPs(): Promise<number> {
    const { count, error } = await supabase
      .from('mvps')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    if (error) {
      console.error('Error fetching total MVP count:', error);
      return 0;
    }
    return count || 0;
  }

  static async getTotalDeployments(): Promise<number> {
    const { count, error } = await supabase
      .from('deployments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    if (error) {
      console.error('Error fetching total deployment count:', error);
      return 0;
    }
    return count || 0;
  }

  static async createStripeConnectAccountLink(
    userId: string
  ): Promise<{ success: boolean; message: string; accountLinkUrl?: string }> {
    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: {
          user_id: userId,
          return_url: `${origin}/payouts?status=success`,
          refresh_url: `${origin}/connect-stripe?status=refresh`,
        },
      });

      if (error) {
        console.error('Error invoking create-stripe-connect-account:', error);
        throw new Error(error.message || 'Failed to create Stripe Connect account.');
      }

      return {
        success: true,
        message: 'Stripe Connect account link created.',
        accountLinkUrl: data.account_link_url,
      };
    } catch (error: any) {
      console.error('Error in createStripeConnectAccountLink:', error);
      return {
        success: false,
        message: error.message || 'Failed to create Stripe Connect account link.',
      };
    }
  }

  static async getSellerPayouts(
    sellerId: string
  ): Promise<
    {
      id: string;
      month_year: string;
      total_downloads: number;
      commission_amount: number;
      platform_fee_deducted: number;
      stripe_transfer_id: string | null;
      status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
      created_at: string;
      processed_at: string | null;
    }[]
  > {
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching seller payouts:', error);
      return [];
    }
    return data || [];
  }
}

export class NotificationService {
  static async getNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unreadOnly !== undefined) {
      query = query.eq('read', !unreadOnly);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
    return data || [];
  }

  static async getUnreadNotificationCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread notification count:', error);
      return 0;
    }
    return count || 0;
  }

  static async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  static async markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  static async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'read'>): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('notifications').insert([
      {
        user_id: notification.user_id,
        type: notification.type,
        message: notification.message,
        link: notification.link || null,
        read: false,
      },
    ]);

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }
}

export class RefundService {
  static async submitRefundRequest(requestData: {
    userId: string;
    subscriptionId: string;
    reason: string;
    amountRequested: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.from('refund_requests').insert([
        {
          user_id: requestData.userId,
          subscription_id: requestData.subscriptionId,
          reason: requestData.reason,
          amount_requested: requestData.amountRequested,
          status: 'pending',
        },
      ]);

      if (error) {
        console.error('Error submitting refund request:', error);
        throw new Error(error.message || 'Failed to submit refund request.');
      }

      return { success: true, message: 'Refund request submitted successfully. We will review it shortly.' };
    } catch (error: any) {
      console.error('Error in submitRefundRequest:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }

  static async getUserRefundRequests(userId: string): Promise<RefundRequest[]> {
    const { data, error } = await supabase
      .from('refund_requests')
      .select('*, subscription:subscription_id(plan_type, stripe_subscription_id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user refund requests:', error);
      return [];
    }
    return data || [];
  }
}

export class DisputeService {
  static async submitDispute(disputeData: {
    buyerId: string;
    sellerId: string;
    mvpId: string;
    reason: string;
    details: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.from('disputes').insert([
        {
          buyer_id: disputeData.buyerId,
          seller_id: disputeData.sellerId,
          mvp_id: disputeData.mvpId,
          reason: disputeData.reason,
          details: disputeData.details,
          status: 'open',
        },
      ]);

      if (error) {
        console.error('Error submitting dispute:', error);
        throw new Error(error.message || 'Failed to submit dispute.');
      }

      return { success: true, message: 'Dispute submitted successfully. We will review it shortly.' };
    } catch (error: any) {
      console.error('Error in submitDispute:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }

  static async getUserDisputes(userId: string): Promise<Dispute[]> {
    const { data, error } = await supabase
      .from('disputes')
      .select('*, buyer:buyer_id(username, email), seller:seller_id(username, email), mvp:mvp_id(title, slug)')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('opened_at', { ascending: false });

    if (error) {
      console.error('Error fetching user disputes:', error);
      return [];
    }
    return data || [];
  }

  static async getDisputeById(disputeId: string): Promise<Dispute | null> {
    const { data, error } = await supabase
      .from('disputes')
      .select('*, buyer:buyer_id(username, email), seller:seller_id(username, email), mvp:mvp_id(title, slug)')
      .eq('id', disputeId)
      .single();

    if (error) {
      console.error('Error fetching dispute by ID:', error);
      return null;
    }
    return data;
  }
}

export class GitHubService {
  static async validateGitHubRepository(
    owner: string,
    repoName: string,
    userId: string // Pass userId for authentication
  ): Promise<{ success: boolean; message: string; repoData?: any }> {
    try {
      // Get the user's GitHub token
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_oauth_tokens')
        .select('access_token')
        .eq('user_id', userId)
        .eq('provider', 'github')
        .maybeSingle();

      if (tokenError || !tokenData?.access_token) {
        throw new Error('GitHub token not found for user. Please connect your GitHub account in settings.');
      }

      const accessToken = tokenData.access_token;

      const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Repository not found or not accessible.');
      }

      const repoData = await response.json();
      return { success: true, message: 'Repository found!', repoData };
    } catch (error: any) {
      console.error('Error validating GitHub repository:', error);
      return { success: false, message: error.message || 'Failed to validate repository.' };
    }
  }

  static async linkGitHubRepository(
    mvpId: string,
    userId: string, // Pass userId
    owner: string,
    repoName: string,
    webhookSecret: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Update the MVP record with GitHub details
      const { error } = await supabase
        .from('mvps')
        .update({
          github_repo_owner: owner,
          github_repo_name: repoName,
          github_webhook_secret: webhookSecret,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mvpId);

      if (error) {
        console.error('Error linking GitHub repository:', error);
        throw new Error(error.message || 'Failed to link GitHub repository.');
      }

      return { success: true, message: 'GitHub repository linked successfully!' };
    } catch (error: any) {
      console.error('Error in linkGitHubRepository:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }

  static async unlinkGitHubRepository(mvpId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('mvps')
        .update({
          github_repo_owner: null,
          github_repo_name: null,
          github_webhook_secret: null,
          last_synced_github_commit_sha: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mvpId);

      if (error) {
        console.error('Error unlinking GitHub repository:', error);
        throw new Error(error.message || 'Failed to unlink GitHub repository.');
      }

      return { success: true, message: 'GitHub repository unlinked successfully.' };
    } catch (error: any) {
      console.error('Error in unlinkGitHubRepository:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }

  static async getLatestRepositoryInfo(
    owner: string,
    repoName: string,
    userId: string // Pass userId for authentication
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Get the user's GitHub token
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_oauth_tokens')
        .select('access_token')
        .eq('user_id', userId)
        .eq('provider', 'github')
        .maybeSingle();

      if (tokenError || !tokenData?.access_token) {
        throw new Error('GitHub token not found for user. Please connect your GitHub account in settings.');
      }

      const accessToken = tokenData.access_token;

      // Fetch latest commit SHA
      const commitResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/commits/main`, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!commitResponse.ok) {
        const errorData = await commitResponse.json();
        throw new Error(errorData.message || 'Failed to fetch latest commit.');
      }
      const commitData = await commitResponse.json();
      const latestCommitSha = commitData.sha;
      const commitMessage = commitData.commit.message;

      // Fetch latest release info (optional)
      let latestRelease = null;
      try {
        const releaseResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/releases/latest`, {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });
        if (releaseResponse.ok) {
          latestRelease = await releaseResponse.json();
        }
      } catch (releaseError) {
        console.warn('Could not fetch latest release:', releaseError);
      }

      if (latestRelease && new Date(latestRelease.published_at) > new Date(commitData.commit.author.date)) {
        // If latest release is newer than latest commit, use release info
        return {
          success: true,
          message: 'Latest release info fetched.',
          data: {
            type: 'release',
            commit_sha: latestRelease.target_commitish, // Commit SHA associated with the release
            version: latestRelease.tag_name.replace(/^v/, ''), // Remove 'v' prefix if present
            body: latestRelease.body,
            zipball_url: latestRelease.zipball_url,
            archive_url: latestRelease.archive_url.replace('{archive_format}{/ref}', 'zipball/main'), // Ensure zipball URL
          },
        };
      } else {
        // Otherwise, use latest commit info
        return {
          success: true,
          message: 'Latest commit info fetched.',
          data: {
            type: 'commit',
            commit_sha: latestCommitSha,
            message: commitMessage,
            zipball_url: `https://api.github.com/repos/${owner}/${repoName}/zipball/main`,
            archive_url: `https://api.github.com/repos/${owner}/${repoName}/zipball/main`,
          },
        };
      }
    } catch (error: any) {
      console.error('Error getting latest repository info:', error);
      return { success: false, message: error.message || 'Failed to get latest repository information.' };
    }
  }

  static async completeGitHubAppInstallation(
    code: string,
    installationId: number,
    userId: string // Changed from mvpId to userId
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-github-app-installation', {
        body: {
          code,
          installation_id: installationId,
          state: userId, // Pass userId as state
        },
      });

      if (error) {
        console.error('Error invoking create-github-app-installation:', error);
        throw new Error(error.message || 'Failed to complete GitHub App installation.');
      }

      return { success: true, message: data.message || 'GitHub App installed successfully.' };
    } catch (error: any) {
      console.error('Error in completeGitHubAppInstallation:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }
}

export class MarketingService {
  static async processLeadCapture(email: string, agreedToTerms: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('process-lead-capture', {
        body: {
          email,
          agreed_to_terms: agreedToTerms,
          source: 'lead_capture_modal',
          timestamp: new Date().toISOString(),
        },
      });

      if (error) {
        console.error('Error invoking process-lead-capture:', error);
        throw new Error(error.message || 'Failed to process lead capture.');
      }

      return { success: true, message: data.message || 'Thank you for subscribing!' };
    } catch (error: any) {
      console.error('Error in processLeadCapture:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }
}
