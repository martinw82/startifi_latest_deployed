import { supabase } from './supabase';
import type { NewsletterType, UserNewsletterSubscription, NewsletterSubscriber } from '../types';

export class NewsletterService {
  static async getAllNewsletterTypes(): Promise<NewsletterType[]> {
    try {
      const { data, error } = await supabase
        .from('newsletter_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching newsletter types:', error);
      return [];
    }
  }

  static async getNewsletterTypeById(id: string): Promise<NewsletterType | null> {
    try {
      const { data, error } = await supabase
        .from('newsletter_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching newsletter type ${id}:`, error);
      return null;
    }
  }

  static async createNewsletterType(newsletterType: Omit<NewsletterType, 'id' | 'created_at'>): Promise<{ success: boolean; message: string; newsletterType?: NewsletterType }> {
    try {
      const { data, error } = await supabase
        .from('newsletter_types')
        .insert([newsletterType])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'Newsletter type created successfully',
        newsletterType: data
      };
    } catch (error: any) {
      console.error('Error creating newsletter type:', error);
      return {
        success: false,
        message: error.message || 'Failed to create newsletter type'
      };
    }
  }

  static async updateNewsletterType(id: string, updates: Partial<Omit<NewsletterType, 'id' | 'created_at'>>): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('newsletter_types')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      return {
        success: true,
        message: 'Newsletter type updated successfully'
      };
    } catch (error: any) {
      console.error(`Error updating newsletter type ${id}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to update newsletter type'
      };
    }
  }

  static async deleteNewsletterType(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('newsletter_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        success: true,
        message: 'Newsletter type deleted successfully'
      };
    } catch (error: any) {
      console.error(`Error deleting newsletter type ${id}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to delete newsletter type'
      };
    }
  }

  // User Newsletter Subscriptions

  static async getAllUserSubscriptions(): Promise<UserNewsletterSubscription[]> {
    try {
      const { data, error } = await supabase
        .from('user_newsletter_subscriptions')
        .select(`
          *,
          newsletter_type:newsletter_type_id(id, name)
        `)
        .order('subscribed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user newsletter subscriptions:', error);
      return [];
    }
  }

  static async getUserSubscriptions(userId: string): Promise<UserNewsletterSubscription[]> {
    try {
      const { data, error } = await supabase
        .from('user_newsletter_subscriptions')
        .select(`
          *,
          newsletter_type:newsletter_type_id(id, name)
        `)
        .eq('user_id', userId)
        .order('subscribed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching user subscriptions for ${userId}:`, error);
      return [];
    }
  }

  static async subscribeToNewsletter(
    userId: string,
    newsletterTypeId: string,
    email: string,
    source?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Call the subscribe-to-newsletter Edge Function
      const { data, error } = await supabase.functions.invoke('subscribe-to-newsletter', {
        body: {
          user_id: userId,
          newsletter_type_id: newsletterTypeId,
          email,
          source
        }
      });

      if (error) throw error;

      return {
        success: true,
        message: data.message || 'Successfully subscribed to newsletter'
      };
    } catch (error: any) {
      console.error('Error subscribing to newsletter:', error);
      return {
        success: false,
        message: error.message || 'Failed to subscribe to newsletter'
      };
    }
  }

  static async unsubscribeFromNewsletter(
    userId: string,
    newsletterTypeId: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Call the unsubscribe-from-newsletter Edge Function
      const { data, error } = await supabase.functions.invoke('unsubscribe-from-newsletter', {
        body: {
          user_id: userId,
          newsletter_type_id: newsletterTypeId,
          email
        }
      });

      if (error) throw error;

      return {
        success: true,
        message: data.message || 'Successfully unsubscribed from newsletter'
      };
    } catch (error: any) {
      console.error('Error unsubscribing from newsletter:', error);
      return {
        success: false,
        message: error.message || 'Failed to unsubscribe from newsletter'
      };
    }
  }

  // Newsletter Subscribers (from lead capture)

  static async getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching newsletter subscribers:', error);
      return [];
    }
  }

  static async exportSubscribersList(format: 'csv' | 'json'): Promise<string> {
    try {
      const subscribers = await this.getAllNewsletterSubscribers();
      
      if (format === 'csv') {
        // Generate CSV
        const headers = 'Email,Source,Subscribed At,Last Modified,Status\n';
        const rows = subscribers.map(sub => {
          const status = sub.unsubscribed_at ? 'Unsubscribed' : 'Active';
          return `"${sub.email}","${sub.source || ''}","${new Date(sub.subscribed_at).toLocaleString()}","${new Date(sub.last_modified_at).toLocaleString()}","${status}"`;
        }).join('\n');
        return headers + rows;
      } else {
        // JSON format
        return JSON.stringify(subscribers, null, 2);
      }
    } catch (error) {
      console.error('Error exporting subscribers list:', error);
      return '';
    }
  }
}