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
    minPrice?: number;
    maxPrice?: number;
    licensingTerms?: string;
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

      // Price filters
      if (filters?.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }

      if (filters?.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }

      // Licensing terms filter
      if (filters?.licensingTerms) {
        query = query.eq('licensing_terms', filters.licensingTerms);
      }

      if (filters?.search) {
        // Enhanced search to include more fields
        query = query.or(
          `title.ilike.%${filters.search}%,` +
          `description.ilike.%${filters.search}%,` +
          `tagline.ilike.%${filters.search}%,` +
          `changelog.ilike.%${filters.search}%,` +
          `features.cs.{${filters.search}},` +
          `tech_stack.cs.{${filters.search}}`
        );
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

      // Check if user has downloaded this MVP (verified buyer)
      const { data: downloadData, error: downloadError } = await supabase
        .from('downloads')
        .select('id')
        .eq('user_id', reviewData.userId)
        .eq('mvp_id', reviewData.mvpId)
        .maybeSingle();
      
      if (downloadError) {
        console.error('Error checking download history:', downloadError);
        // Continue anyway, but with is_verified_buyer=false
      }
      
      const isVerifiedBuyer = !!downloadData;
      
      // Insert the review into Supabase
      const { data, error } = await supabase.from('reviews').insert([
        {
          mvp_id: reviewData.mvpId,
          user_id: reviewData.userId,
          rating: reviewData.rating,
          review_text: reviewData.comment || null, // Handle empty comments
          is_verified_buyer: isVerifiedBuyer
        }
      ]).select(`
        *,
        user:profiles(email)
      `).single();

      if (error) {
        // Check for unique constraint violation (user already reviewed this MVP)
        if (error.code === '23505') {
          return { success: false, message: 'You have already submitted a review for this MVP. You can update your existing review instead.' };
        }
        throw error;
      }

      // Format the review with user data
      const review: Review = {
        ...data,
        user: data.user || { email: 'Anonymous' }
      };

      return { success: true, message: "Review submitted successfully!", review };
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

// Notification Service for in-app notifications
export class NotificationService {
  static async createNotification(notificationData: {
    user_id: string;
    type: string;
    message: string;
    link?: string;
  }): Promise<{ success: boolean; notification?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: notificationData.user_id,
          type: notificationData.type,
          message: notificationData.message,
          link: notificationData.link,
          read: false
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return { success: false, error: error.message };
      }

      return { success: true, notification: data };
    } catch (error: any) {
      console.error('Error in createNotification:', error);
      return { success: false, error: error.message || 'Failed to create notification' };
    }
  }

  static async getNotifications(userId: string, read?: boolean): Promise<any[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (read !== undefined) {
        query = query.eq('read', read);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  static async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error counting unread notifications:', error);
        return 0;
      }

      return count || 0;
    } catch (error: any) {
      console.error('Error in getUnreadNotificationCount:', error);
      return 0;
    }
  }

  static async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          seen_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in markNotificationAsRead:', error);
      return { success: false, error: error.message || 'Failed to mark notification as read' };
    }
  }

  static async markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          seen_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in markAllNotificationsAsRead:', error);
      return { success: false, error: error.message || 'Failed to mark all notifications as read' };
    }
  }
}

// Refund Request Service
export class RefundService {
  static async submitRefundRequest(data: { 
    userId: string; 
    subscriptionId: string; 
    reason: string; 
    amountRequested: number 
  }): Promise<{ success: boolean; message: string; refundRequest?: any }> {
    try {
      // Validate the data
      if (!data.userId) throw new Error('User ID is required');
      if (!data.subscriptionId) throw new Error('Subscription ID is required');
      if (!data.reason) throw new Error('Reason is required');
      if (!data.amountRequested || data.amountRequested <= 0) {
        throw new Error('Amount requested must be greater than zero');
      }

      // Insert the refund request
      const { data: refundRequest, error } = await supabase
        .from('refund_requests')
        .insert([{
          user_id: data.userId,
          subscription_id: data.subscriptionId,
          reason: data.reason,
          amount_requested: data.amountRequested,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error submitting refund request:', error);
        return { success: false, message: error.message };
      }

      // Notify the admin team of the new refund request
      try {
        // Get all admin users
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['admin', 'both']);

        // Create notification for each admin
        if (admins && admins.length > 0) {
          const notifications = admins.map(admin => ({
            user_id: admin.id,
            type: 'refund_request',
            message: `New refund request submitted for $${data.amountRequested.toFixed(2)}`,
            link: '/admin?tab=refunds',
            read: false
          }));

          await supabase.from('notifications').insert(notifications);
        }
      } catch (notificationError) {
        console.warn('Failed to notify admins of refund request:', notificationError);
        // Continue despite notification error
      }

      return { 
        success: true, 
        message: 'Refund request submitted successfully', 
        refundRequest 
      };
    } catch (error: any) {
      console.error('Error in submitRefundRequest:', error);
      return { success: false, message: error.message || 'Failed to submit refund request' };
    }
  }

  static async getUserRefundRequests(userId: string): Promise<RefundRequest[]> {
    try {
      const { data, error } = await supabase
        .from('refund_requests')
        .select(`
          *,
          subscription:subscriptions(plan_type, stripe_subscription_id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user refund requests:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getUserRefundRequests:', error);
      return [];
    }
  }

  static async getRefundRequests(status?: 'pending' | 'approved' | 'rejected' | 'processed'): Promise<RefundRequest[]> {
    try {
      let query = supabase
        .from('refund_requests')
        .select(`
          *,
          user:profiles!refund_requests_user_id_fkey(email, username),
          subscription:subscriptions(plan_type, stripe_subscription_id)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching refund requests:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getRefundRequests:', error);
      return [];
    }
  }

  static async updateRefundRequestStatus(
    requestId: string, 
    status: 'approved' | 'rejected' | 'processed', 
    processedBy: string, 
    stripeRefundId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get the current refund request to check its status
      const { data: currentRequest, error: fetchError } = await supabase
        .from('refund_requests')
        .select('status, user_id, amount_requested')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        console.error('Error fetching current refund request:', fetchError);
        return { success: false, message: 'Refund request not found' };
      }

      // Only allow updates if current status is 'pending' or if changing from 'approved' to 'processed'
      if (currentRequest.status !== 'pending' && 
          !(currentRequest.status === 'approved' && status === 'processed')) {
        return { success: false, message: `Cannot update request with status '${currentRequest.status}' to '${status}'` };
      }

      // Prepare the update data
      const updateData: Record<string, any> = {
        status: status,
        processed_by: processedBy
      };

      // Add processed_at and stripe_refund_id if applicable
      if (status === 'approved' || status === 'processed') {
        updateData.processed_at = new Date().toISOString();
      }

      if (status === 'processed' && stripeRefundId) {
        updateData.stripe_refund_id = stripeRefundId;
      }

      // Update the refund request
      const { error } = await supabase
        .from('refund_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        console.error('Error updating refund request:', error);
        return { success: false, message: error.message };
      }

      // Notify the user about the status change
      try {
        let notificationMessage = '';
        if (status === 'approved') {
          notificationMessage = 'Your refund request has been approved and will be processed soon.';
        } else if (status === 'rejected') {
          notificationMessage = 'Your refund request has been rejected.';
        } else if (status === 'processed') {
          notificationMessage = `Your refund of $${currentRequest.amount_requested.toFixed(2)} has been processed.`;
        }

        if (notificationMessage) {
          await NotificationService.createNotification({
            user_id: currentRequest.user_id,
            type: `refund_${status}`,
            message: notificationMessage
          });
        }
      } catch (notificationError) {
        console.warn('Failed to send notification about refund status change:', notificationError);
        // Continue despite notification error
      }

      return { success: true, message: `Refund request marked as ${status}` };
    } catch (error: any) {
      console.error('Error in updateRefundRequestStatus:', error);
      return { success: false, message: error.message || 'Failed to update refund request status' };
    }
  }

  static async processRefund(
    requestId: string, 
    adminId: string
  ): Promise<{ success: boolean; message: string; refundId?: string }> {
    try {
      // Get the refund request details
      const { data: request, error: fetchError } = await supabase
        .from('refund_requests')
        .select(`
          id,
          user_id,
          subscription_id,
          amount_requested,
          status,
          subscription:subscriptions(stripe_subscription_id)
        `)
        .eq('id', requestId)
        .single();

      if (fetchError) {
        console.error('Error fetching refund request:', fetchError);
        return { success: false, message: 'Refund request not found' };
      }

      // Only allow processing if status is 'approved'
      if (request.status !== 'approved') {
        return { success: false, message: `Cannot process refund with status '${request.status}', must be 'approved'` };
      }

      // Check if we have the Stripe subscription ID
      if (!request.subscription?.stripe_subscription_id) {
        return { success: false, message: 'No Stripe subscription ID found for this refund' };
      }

      // In a real implementation, here we would:
      // 1. Call Stripe API to process the actual refund
      // 2. Get the refund ID from Stripe response
      // 3. Update the refund request with status 'processed' and the Stripe refund ID

      // For now, we'll simulate this with a mock refund ID
      const mockRefundId = `re_mock_${Date.now()}`;

      // Update the refund request status to 'processed'
      const result = await this.updateRefundRequestStatus(
        requestId,
        'processed',
        adminId,
        mockRefundId
      );

      if (!result.success) {
        return result;
      }

      return { 
        success: true, 
        message: 'Refund processed successfully', 
        refundId: mockRefundId 
      };
    } catch (error: any) {
      console.error('Error in processRefund:', error);
      return { success: false, message: error.message || 'Failed to process refund' };
    }
  }
}

// Dispute Service
export class DisputeService {
  static async submitDispute(data: { 
    buyerId: string; 
    sellerId: string; 
    mvpId: string; 
    reason: string; 
    details: string 
  }): Promise<{ success: boolean; message: string; dispute?: any }> {
    try {
      // Validate the data
      if (!data.buyerId) throw new Error('Buyer ID is required');
      if (!data.sellerId) throw new Error('Seller ID is required');
      if (!data.mvpId) throw new Error('MVP ID is required');
      if (!data.reason) throw new Error('Reason is required');
      if (!data.details) throw new Error('Details are required');

      // Insert the dispute
      const { data: dispute, error } = await supabase
        .from('disputes')
        .insert([{
          buyer_id: data.buyerId,
          seller_id: data.sellerId,
          mvp_id: data.mvpId,
          reason: data.reason,
          details: data.details,
          status: 'open'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error submitting dispute:', error);
        return { success: false, message: error.message };
      }

      // Notify both the seller and admins about the new dispute
      try {
        // Notify seller
        await NotificationService.createNotification({
          user_id: data.sellerId,
          type: 'new_dispute',
          message: `A buyer has opened a dispute regarding one of your MVPs`,
          link: `/disputes/${dispute.id}`
        });

        // Get all admin users
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['admin', 'both']);

        // Create notification for each admin
        if (admins && admins.length > 0) {
          const notifications = admins.map(admin => ({
            user_id: admin.id,
            type: 'new_dispute',
            message: `New dispute opened between buyer and seller`,
            link: '/admin?tab=disputes',
            read: false
          }));

          await supabase.from('notifications').insert(notifications);
        }
      } catch (notificationError) {
        console.warn('Failed to send notifications about new dispute:', notificationError);
        // Continue despite notification error
      }

      return { 
        success: true, 
        message: 'Dispute submitted successfully', 
        dispute 
      };
    } catch (error: any) {
      console.error('Error in submitDispute:', error);
      return { success: false, message: error.message || 'Failed to submit dispute' };
    }
  }

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
        console.error('Error fetching user disputes:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getUserDisputes:', error);
      return [];
    }
  }

  static async getDisputes(status?: 'open' | 'in_review' | 'resolved_buyer' | 'resolved_seller' | 'closed_no_action'): Promise<Dispute[]> {
    try {
      let query = supabase
        .from('disputes')
        .select(`
          *,
          buyer:profiles!disputes_buyer_id_fkey(email, username),
          seller:profiles!disputes_seller_id_fkey(email, username),
          mvp:mvps(title, slug)
        `)
        .order('opened_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching disputes:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getDisputes:', error);
      return [];
    }
  }

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
        console.error('Error fetching dispute:', error);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('Error in getDisputeById:', error);
      return null;
    }
  }

  static async updateDisputeStatus(
    disputeId: string, 
    status: 'in_review' | 'resolved_buyer' | 'resolved_seller' | 'closed_no_action', 
    resolvedBy: string, 
    resolutionDetails?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get the current dispute to check its status and get user IDs
      const { data: currentDispute, error: fetchError } = await supabase
        .from('disputes')
        .select('status, buyer_id, seller_id, mvp_id')
        .eq('id', disputeId)
        .single();

      if (fetchError) {
        console.error('Error fetching current dispute:', fetchError);
        return { success: false, message: 'Dispute not found' };
      }

      // Only allow updates if current status is 'open' or 'in_review'
      if (currentDispute.status !== 'open' && currentDispute.status !== 'in_review') {
        return { success: false, message: `Cannot update dispute with status '${currentDispute.status}'` };
      }

      // Prepare the update data
      const updateData: Record<string, any> = {
        status: status,
        resolved_by: resolvedBy
      };

      // Add resolution details if provided
      if (resolutionDetails) {
        updateData.resolution_details = resolutionDetails;
      }

      // Add resolved_at timestamp if the dispute is being resolved
      if (status !== 'in_review') {
        updateData.resolved_at = new Date().toISOString();
      }

      // Update the dispute
      const { error } = await supabase
        .from('disputes')
        .update(updateData)
        .eq('id', disputeId);

      if (error) {
        console.error('Error updating dispute:', error);
        return { success: false, message: error.message };
      }

      // Notify both buyer and seller about the status change
      try {
        let buyerMessage = '';
        let sellerMessage = '';

        if (status === 'in_review') {
          buyerMessage = 'Your dispute is now under review by our team.';
          sellerMessage = 'A dispute involving your MVP is now under review by our team.';
        } else if (status === 'resolved_buyer') {
          buyerMessage = 'Your dispute has been resolved in your favor.';
          sellerMessage = 'A dispute has been resolved in favor of the buyer.';
        } else if (status === 'resolved_seller') {
          buyerMessage = 'Your dispute has been resolved in favor of the seller.';
          sellerMessage = 'A dispute has been resolved in your favor.';
        } else if (status === 'closed_no_action') {
          buyerMessage = 'Your dispute has been closed without further action.';
          sellerMessage = 'A dispute involving your MVP has been closed without further action.';
        }

        // Notify buyer
        if (buyerMessage) {
          await NotificationService.createNotification({
            user_id: currentDispute.buyer_id,
            type: `dispute_${status}`,
            message: buyerMessage,
            link: `/disputes/${disputeId}`
          });
        }

        // Notify seller
        if (sellerMessage) {
          await NotificationService.createNotification({
            user_id: currentDispute.seller_id,
            type: `dispute_${status}`,
            message: sellerMessage,
            link: `/disputes/${disputeId}`
          });
        }
      } catch (notificationError) {
        console.warn('Failed to send notifications about dispute status change:', notificationError);
        // Continue despite notification error
      }

      return { success: true, message: `Dispute status updated to ${status}` };
    } catch (error: any) {
      console.error('Error in updateDisputeStatus:', error);
      return { success: false, message: error.message || 'Failed to update dispute status' };
    }
  }
}

/**
 * Service for handling notifications
 */
export class NotificationService {
  /**
   * Get notifications for a user
   * @param userId The user ID
   * @param readStatus Optional filter by read status
   */
  static async getNotifications(userId: string, readStatus?: boolean) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply read status filter if provided
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
   * Mark a notification as read
   * @param notificationId The notification ID
   */
  static async markNotificationAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in markNotificationAsRead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark all notifications for a user as read
   * @param userId The user ID
   */
  static async markAllNotificationsAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in markAllNotificationsAsRead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get the count of unread notifications for a user
   * @param userId The user ID
   */
  static async getUnreadNotificationCount(userId: string) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error counting unread notifications:', error);
        throw error;
      }

      return count || 0;
    } catch (error: any) {
      console.error('Error in getUnreadNotificationCount:', error);
      return 0;
    }
  }

  /**
   * Create a new notification
   * @param notification The notification data
   */
  static async createNotification(notification: { 
    user_id: string; 
    type: string; 
    message: string; 
    link?: string 
  }) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([notification]);

      if (error) {
        console.error('Error creating notification:', error);
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in createNotification:', error);
      return { success: false, error: error.message };
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

  /**
   * Admin-specific methods
   */
  static async getAllProfilesForAdmin(
    filters?: { role?: string; sellerApproval?: boolean; search?: string }
  ) {
    try {
      if (!await this.isAdmin()) {
        throw new Error('Unauthorized access');
      }

      let query = supabase
        .from('profiles')
        .select(`
          id,
          email,
          username,
          display_name,
          role,
          is_seller_approved,
          stripe_customer_id,
          stripe_account_id,
          downloads_remaining,
          last_quota_reset_at,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Apply filters if provided
      if (filters?.role && filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }

      if (filters?.sellerApproval !== undefined) {
        query = query.eq('is_seller_approved', filters.sellerApproval);
      }

      if (filters?.search) {
        query = query.or(`email.ilike.%${filters.search}%,username.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user profiles:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getAllProfilesForAdmin:', error);
      throw error;
    }
  }

  static async updateUserProfileByAdmin(
    userId: string,
    updates: { role?: string; is_seller_approved?: boolean }
  ) {
    try {
      if (!await this.isAdmin()) {
        throw new Error('Unauthorized access');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateUserProfileByAdmin:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAdminAnalytics(period?: 'day' | 'week' | 'month' | 'year') {
    try {
      if (!await this.isAdmin()) {
        throw new Error('Unauthorized access');
      }

      // Get total counts for key metrics
      const [
        { count: totalUsers },
        { count: totalSellers },
        { count: totalMVPs },
        { count: totalDownloads },
        { data: revenueData },
        { data: mvpRatings },
        { data: downloadTrend },
        { data: userGrowth }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .or('role.eq.seller,role.eq.both')
          .eq('is_seller_approved', true),
        supabase.from('mvps').select('*', { count: 'exact', head: true })
          .eq('status', 'approved'),
        supabase.from('downloads').select('*', { count: 'exact', head: true }),
        supabase.from('stripe_orders').select('amount_total, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('mvps').select('average_rating')
          .eq('status', 'approved'),
        // Get download trends (simplified - this would be more complex in production)
        supabase.from('downloads')
          .select('month_year, count(*)')
          .group('month_year')
          .order('month_year', { ascending: false })
          .limit(12),
        // Get user growth over time (simplified)
        supabase.from('profiles')
          .select('created_at')
          .order('created_at', { ascending: false })
      ]);

      // Calculate total revenue
      const totalRevenue = revenueData?.reduce((sum, order) => 
        sum + (order.amount_total || 0), 0) || 0;
      
      // Calculate average rating
      const allRatings = mvpRatings?.filter(mvp => mvp.average_rating > 0)
        .map(mvp => mvp.average_rating) || [];
      const averageRating = allRatings.length > 0
        ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length
        : 0;

      // Prepare trend data
      const downloadsByMonth = downloadTrend?.reduce((acc, item) => {
        acc[item.month_year] = item.count;
        return acc;
      }, {} as Record<string, number>) || {};

      // Group users by month for growth chart
      const usersByMonth: Record<string, number> = {};
      userGrowth?.forEach(user => {
        const monthYear = new Date(user.created_at).toISOString().substring(0, 7); // YYYY-MM
        usersByMonth[monthYear] = (usersByMonth[monthYear] || 0) + 1;
      });

      return {
        counts: {
          totalUsers,
          totalSellers,
          totalMVPs,
          totalDownloads,
          totalRevenue: totalRevenue / 100, // Convert from cents to dollars
          averageRating
        },
        trends: {
          downloads: downloadsByMonth,
          users: usersByMonth,
          // More trends could be added here
        }
      };
    } catch (error: any) {
      console.error('Error in getAdminAnalytics:', error);
      throw error;
    }
  }

  static async processPayout(payoutId: string) {
    try {
      if (!await this.isAdmin()) {
        throw new Error('Unauthorized access');
      }

      // Call the process-payout Edge Function
      const { data, error } = await supabase.functions.invoke('process-payout', {
        body: { payoutId }
      });

      if (error) {
        console.error('Error calling process-payout function:', error);
        return { success: false, message: error.message || 'Failed to process payout' };
      }

      if (data?.success) {
        return { success: true, message: data.message || 'Payout processing initiated' };
      } else {
        return { success: false, message: data?.message || 'Failed to process payout' };
      }
    } catch (error: any) {
      console.error('Error in processPayout:', error);
      return { success: false, message: error.message || 'An unexpected error occurred' };
    }
  }

  static async getPendingPayouts() {
    try {
      if (!await this.isAdmin()) {
        throw new Error('Unauthorized access');
      }

      const { data, error } = await supabase
        .from('payouts')
        .select(`
          *,
          profiles!payouts_seller_id_fkey(id, email, username, display_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending payouts:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getPendingPayouts:', error);
      throw error;
    }
  }

  /**
   * Helper method to check if current user is an admin
   */
  private static async isAdmin(): Promise<boolean> {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      return profile?.role === 'admin' || profile?.role === 'both';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
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