// src/lib/api.ts
import { supabase } from './supabase';
import type { MVP, Review, Download, Notification, RefundRequest, Dispute, User, NewsletterType, NewsletterSubscriber, UserNewsletterSubscription } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Mock data for demonstration purposes
// In a real application, this would be fetched from a database or external API
const MOCK_MVPS: MVP[] = [
  {
    id: 'mvp-1',
    seller_id: 'seller-1',
    title: 'AI-Powered SaaS Starter Kit',
    slug: 'ai-saas-starter-kit',
    tagline: 'Launch your AI SaaS faster with this comprehensive starter kit.',
    description: `This boilerplate provides a robust foundation for your next AI-powered SaaS application. It includes user authentication, subscription management, a powerful admin dashboard, and integrations with popular AI APIs. Built with Next.js, TypeScript, and Supabase, it's designed for scalability and developer happiness.
    
    **Key Features:**
    - User Authentication (Sign up, Login, Password Reset)
    - Subscription Management with Stripe Integration
    - Admin Dashboard for User & Content Management
    - AI API Integration Examples (OpenAI, Hugging Face)
    - Responsive UI with Tailwind CSS
    - Database Integration with Supabase
    - Comprehensive Documentation
    - Dockerized for easy deployment`,
    features: [
      'User Authentication',
      'Subscription Management',
      'Admin Dashboard',
      'AI API Integration',
      'Responsive Design',
      'Supabase Integration',
      'Docker Support',
      'Comprehensive Docs'
    ],
    tech_stack: ['Next.js', 'TypeScript', 'React', 'Tailwind CSS', 'Supabase', 'Stripe', 'OpenAI'],
    category: 'SaaS',
    ipfs_hash: 'QmYyGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz123456',
    file_size: 1024 * 1024 * 50, // 50 MB
    preview_images: [
      'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      'https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    ],
    demo_url: 'https://ai-saas-demo.vercel.app',
    github_url: 'https://github.com/example/ai-saas-starter',
    licensing_terms: 'standard_commercial',
    status: 'approved',
    version_number: '1.0.0',
    changelog: 'Initial release with core features.',
    download_count: 1250,
    average_rating: 4.8,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-06-20T14:30:00Z',
    published_at: '2024-01-20T10:00:00Z',
    access_tier: 'subscription',
    price: 0,
    seller: {
      id: 'seller-1',
      email: 'seller1@example.com',
    },
  },
  {
    id: 'mvp-2',
    seller_id: 'seller-2',
    title: 'E-commerce Storefront with AI Recommendations',
    slug: 'ecommerce-ai-recs',
    tagline: 'A modern e-commerce solution featuring AI-driven product recommendations.',
    description: 'Full-featured e-commerce template with user accounts, product listings, shopping cart, checkout, and AI-powered recommendation engine. Integrates with Stripe for payments and uses React with a Node.js backend.',
    features: ['Product Catalog', 'Shopping Cart', 'User Accounts', 'Stripe Payments', 'AI Recommendations'],
    tech_stack: ['React', 'Node.js', 'Express', 'MongoDB', 'Stripe', 'Python (AI)'],
    category: 'E-commerce',
    ipfs_hash: 'QmXyZzWwVvUuTtSsRrQqPpOoNnMmLlKkJjIiHhGgFfEeDdCcBbAa',
    file_size: 1024 * 1024 * 70, // 70 MB
    preview_images: [
      'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      'https://images.pexels.com/photos/1027130/pexels-photo-1027130.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    ],
    demo_url: 'https://ecommerce-ai-demo.netlify.app',
    github_url: 'https://github.com/example/ecommerce-ai',
    licensing_terms: 'premium_commercial',
    status: 'approved',
    version_number: '1.2.0',
    changelog: 'Added new payment gateways and improved recommendation algorithm.',
    download_count: 890,
    average_rating: 4.5,
    created_at: '2023-11-01T09:00:00Z',
    updated_at: '2024-05-10T11:00:00Z',
    published_at: '2023-11-15T09:00:00Z',
    access_tier: 'one_time_sale',
    price: 199.99,
    seller: {
      id: 'seller-2',
      email: 'seller2@example.com',
    },
  },
  {
    id: 'mvp-3',
    seller_id: 'seller-1',
    title: 'Personal Portfolio Generator',
    slug: 'portfolio-generator',
    tagline: 'Generate a stunning personal portfolio website in minutes.',
    description: 'A simple yet elegant portfolio website generator. Input your projects, skills, and bio, and it generates a responsive, modern portfolio site. Perfect for developers, designers, and freelancers.',
    features: ['Easy Customization', 'Responsive Design', 'Project Showcase', 'Contact Form'],
    tech_stack: ['Vue.js', 'Tailwind CSS', 'Firebase'],
    category: 'Portfolio',
    ipfs_hash: 'QmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890AbCdEf',
    file_size: 1024 * 1024 * 15, // 15 MB
    preview_images: [
      'https://images.pexels.com/photos/326576/pexels-photo-326576.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    ],
    demo_url: 'https://portfolio-gen.web.app',
    github_url: 'https://github.com/example/portfolio-generator',
    licensing_terms: 'personal_use_only',
    status: 'approved',
    version_number: '1.0.0',
    changelog: 'Initial release.',
    download_count: 2300,
    average_rating: 4.9,
    created_at: '2024-02-01T12:00:00Z',
    updated_at: '2024-02-01T12:00:00Z',
    published_at: '2024-02-05T12:00:00Z',
    access_tier: 'free',
    price: 0,
    seller: {
      id: 'seller-1',
      email: 'seller1@example.com',
    },
  },
  {
    id: 'mvp-4',
    seller_id: 'seller-3',
    title: 'Task Management Dashboard',
    slug: 'task-manager-dashboard',
    tagline: 'A clean and intuitive dashboard for managing your daily tasks.',
    description: 'Organize your tasks, set priorities, and track progress with this minimalist task management dashboard. Features include drag-and-drop reordering, due dates, and user-specific task lists.',
    features: ['Task Creation', 'Prioritization', 'Drag & Drop', 'User-specific Lists'],
    tech_stack: ['Angular', 'TypeScript', 'Node.js', 'PostgreSQL'],
    category: 'Dashboard',
    ipfs_hash: 'QmBcDeFgHiJkLmNoPqRsTuVwXyZz1234567890Ab',
    file_size: 1024 * 1024 * 30, // 30 MB
    preview_images: [
      'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    ],
    demo_url: 'https://task-manager-demo.vercel.app',
    github_url: 'https://github.com/example/task-manager',
    licensing_terms: 'standard_commercial',
    status: 'pending_review', // Example of a pending MVP
    version_number: '1.0.0',
    changelog: 'Initial submission for review.',
    download_count: 0,
    average_rating: 0.0,
    created_at: '2024-06-25T08:00:00Z',
    updated_at: '2024-06-25T08:00:00Z',
    published_at: null,
    access_tier: 'subscription',
    price: 0,
    seller: {
      id: 'seller-3',
      email: 'seller3@example.com',
    },
  },
  {
    id: 'mvp-5',
    seller_id: 'seller-1',
    title: 'Simple Blog Platform',
    slug: 'simple-blog-platform',
    tagline: 'A lightweight and fast blog platform for content creators.',
    description: 'Create and manage blog posts with ease. Features a rich text editor, markdown support, and a responsive design. Ideal for personal blogs or small content sites.',
    features: ['Content Management', 'Rich Text Editor', 'Markdown Support', 'Responsive Design'],
    tech_stack: ['Svelte', 'Firebase', 'Tailwind CSS'],
    category: 'Utility',
    ipfs_hash: 'QmFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz123456',
    file_size: 1024 * 1024 * 20, // 20 MB
    preview_images: [
      'https://images.pexels.com/photos/1591056/pexels-photo-1591056.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    ],
    demo_url: 'https://svelte-blog-demo.netlify.app',
    github_url: 'https://github.com/example/svelte-blog',
    licensing_terms: 'standard_commercial',
    status: 'approved',
    version_number: '1.0.0',
    changelog: 'Initial release.',
    download_count: 500,
    average_rating: 4.2,
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
    published_at: '2024-03-05T10:00:00Z',
    access_tier: 'free',
    price: 0,
    seller: {
      id: 'seller-1',
      email: 'seller1@example.com',
    },
  },
  {
    id: 'mvp-6',
    seller_id: 'seller-2',
    title: 'Fitness Tracker App',
    slug: 'fitness-tracker-app',
    tagline: 'Track your workouts and progress with this intuitive fitness app.',
    description: 'A mobile-first fitness tracking application. Log your exercises, monitor your progress, and visualize your fitness journey. Includes user profiles and data synchronization.',
    features: ['Workout Logging', 'Progress Tracking', 'Data Visualization', 'User Profiles'],
    tech_stack: ['React Native', 'Node.js', 'GraphQL', 'PostgreSQL'],
    category: 'Mobile App',
    ipfs_hash: 'QmPpQqRrSsTtUuVvWwXxYyZz1234567890AbCdEfGh',
    file_size: 1024 * 1024 * 60, // 60 MB
    preview_images: [
      'https://images.pexels.com/photos/416717/pexels-photo-416717.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    ],
    demo_url: 'https://fitness-app-demo.netlify.app',
    github_url: 'https://github.com/example/fitness-tracker',
    licensing_terms: 'standard_commercial',
    status: 'approved',
    version_number: '1.0.0',
    changelog: 'Initial release.',
    download_count: 700,
    average_rating: 4.7,
    created_at: '2024-04-10T11:00:00Z',
    updated_at: '2024-04-10T11:00:00Z',
    published_at: '2024-04-15T11:00:00Z',
    access_tier: 'one_time_sale',
    price: 149.99,
    seller: {
      id: 'seller-2',
      email: 'seller2@example.com',
    },
  },
];

const MOCK_REVIEWS: Review[] = [
  {
    id: 'review-1',
    user_id: 'user-1',
    mvp_id: 'mvp-1',
    rating: 5,
    review_text: 'This kit is amazing! Saved me weeks of development time. Highly recommend for any SaaS project.',
    created_at: '2024-01-25T10:00:00Z',
    is_verified_buyer: true,
    user: { email: 'user1@example.com' }
  },
  {
    id: 'review-2',
    user_id: 'user-2',
    mvp_id: 'mvp-1',
    rating: 4,
    review_text: 'Great starting point, very clean code. Some parts needed customization but overall excellent.',
    created_at: '2024-02-01T11:30:00Z',
    is_verified_buyer: true,
    user: { email: 'user2@example.com' }
  },
  {
    id: 'review-3',
    user_id: 'user-3',
    mvp_id: 'mvp-2',
    rating: 5,
    review_text: 'The AI recommendations are a game-changer for my store. Easy to integrate and works flawlessly.',
    created_at: '2023-12-01T14:00:00Z',
    is_verified_buyer: true,
    user: { email: 'user3@example.com' }
  },
  {
    id: 'review-4',
    user_id: 'user-4',
    mvp_id: 'mvp-3',
    rating: 5,
    review_text: 'Generated a beautiful portfolio in minutes. Exactly what I needed!',
    created_at: '2024-02-10T09:00:00Z',
    is_verified_buyer: false, // Not a verified buyer
    user: { email: 'user4@example.com' }
  },
];

const MOCK_DOWNLOADS: Download[] = [
  {
    id: 'dl-1',
    user_id: 'user-1',
    mvp_id: 'mvp-1',
    downloaded_at: '2024-01-20T15:00:00Z',
    month_year: '2024-01',
    mvps: MOCK_MVPS[0]
  },
  {
    id: 'dl-2',
    user_id: 'user-1',
    mvp_id: 'mvp-3',
    downloaded_at: '2024-02-05T10:00:00Z',
    month_year: '2024-02',
    mvps: MOCK_MVPS[2]
  },
  {
    id: 'dl-3',
    user_id: 'user-2',
    mvp_id: 'mvp-1',
    downloaded_at: '2024-01-22T11:00:00Z',
    month_year: '2024-01',
    mvps: MOCK_MVPS[0]
  },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    user_id: 'user-1',
    type: 'new_download',
    message: 'Your MVP "AI-Powered SaaS Starter Kit" was downloaded!',
    link: '/mvp/mvp-1',
    read: false,
    created_at: '2024-06-28T10:00:00Z'
  },
  {
    id: 'notif-2',
    user_id: 'user-1',
    type: 'new_review',
    message: 'You received a new 5-star review on "AI-Powered SaaS Starter Kit"!',
    link: '/mvp/mvp-1',
    read: false,
    created_at: '2024-06-27T15:30:00Z'
  },
  {
    id: 'notif-3',
    user_id: 'user-1',
    type: 'mvp_approved',
    message: 'Your MVP "Personal Portfolio Generator" has been approved and is now live!',
    link: '/mvp/mvp-3',
    read: true,
    created_at: '2024-06-20T09:00:00Z'
  },
  {
    id: 'notif-4',
    user_id: 'user-1',
    type: 'payout_initiated',
    message: 'Your payout of $150.00 for May sales has been initiated.',
    link: '/payouts',
    read: false,
    created_at: '2024-06-01T12:00:00Z'
  }
];

const MOCK_REFUND_REQUESTS: RefundRequest[] = [
  {
    id: 'refund-1',
    user_id: 'user-1',
    subscription_id: 'sub-1',
    reason: 'Not what I expected',
    amount_requested: 29.99,
    status: 'pending',
    created_at: '2024-06-20T10:00:00Z',
    user: { email: 'user1@example.com' },
    subscription: { plan_type: 'pro', stripe_subscription_id: 'stripe-sub-1' }
  },
  {
    id: 'refund-2',
    user_id: 'user-2',
    subscription_id: 'sub-2',
    reason: 'Accidental purchase',
    amount_requested: 9.99,
    status: 'approved',
    processed_at: '2024-06-15T11:00:00Z',
    created_at: '2024-06-10T09:00:00Z',
    user: { email: 'user2@example.com' },
    subscription: { plan_type: 'basic', stripe_subscription_id: 'stripe-sub-2' }
  }
];

const MOCK_DISPUTES: Dispute[] = [
  {
    id: 'dispute-1',
    buyer_id: 'user-1',
    seller_id: 'seller-2',
    mvp_id: 'mvp-2',
    reason: 'Non-functioning code',
    details: 'The AI recommendation engine does not work as advertised. It throws an error when trying to initialize the model. I have followed all installation steps precisely.',
    status: 'open',
    opened_at: '2024-06-25T14:00:00Z',
    buyer: { email: 'user1@example.com' },
    seller: { email: 'seller2@example.com' },
    mvp: { title: 'E-commerce Storefront with AI Recommendations', slug: 'ecommerce-ai-recs' }
  },
  {
    id: 'dispute-2',
    buyer_id: 'user-3',
    seller_id: 'seller-1',
    mvp_id: 'mvp-1',
    reason: 'Missing features',
    details: 'The kit claims to have Docker support but the Dockerfile is incomplete and does not build correctly. This was a key reason for my purchase.',
    status: 'in_review',
    opened_at: '2024-06-20T10:00:00Z',
    buyer: { email: 'user3@example.com' },
    seller: { email: 'seller1@example.com' },
    mvp: { title: 'AI-Powered SaaS Starter Kit', slug: 'ai-saas-starter-kit' }
  }
];

const MOCK_NEWSLETTER_TYPES: NewsletterType[] = [
  {
    id: 'general-site-updates-id',
    name: 'General Site Updates & Announcements',
    description: 'Receive news about our platform, new features, and occasional promotions.',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'seller-tips-id',
    name: 'Seller Tips & Best Practices',
    description: 'Tips and strategies for maximizing your sales as an MVP seller.',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const MOCK_NEWSLETTER_SUBSCRIBERS: NewsletterSubscriber[] = [
  {
    id: 'sub-1',
    email: 'test1@example.com',
    source: 'homepage_modal',
    agreed_to_terms: true,
    subscribed_at: '2024-05-01T10:00:00Z',
    last_modified_at: '2024-05-01T10:00:00Z',
    unsubscribed_at: undefined,
    categories: ['updates', 'marketing'],
  },
  {
    id: 'sub-2',
    email: 'test2@example.com',
    source: 'footer',
    agreed_to_terms: true,
    subscribed_at: '2024-04-15T11:00:00Z',
    last_modified_at: '2024-04-15T11:00:00Z',
    unsubscribed_at: '2024-06-01T12:00:00Z',
    categories: ['updates'],
  },
];

const MOCK_USER_NEWSLETTER_SUBSCRIPTIONS: UserNewsletterSubscription[] = [
  {
    id: 'user-sub-1',
    user_id: 'user-1',
    newsletter_type_id: 'general-site-updates-id',
    subscribed_at: '2024-01-01T00:00:00Z',
    unsubscribed_at: undefined,
    status: 'active',
    source: 'signup',
    last_modified_at: '2024-01-01T00:00:00Z',
    newsletter_type: MOCK_NEWSLETTER_TYPES[0],
  },
  {
    id: 'user-sub-2',
    user_id: 'user-1',
    newsletter_type_id: 'seller-tips-id',
    subscribed_at: '2024-02-01T00:00:00Z',
    unsubscribed_at: '2024-06-01T00:00:00Z',
    status: 'inactive',
    source: 'user_settings',
    last_modified_at: '2024-06-01T00:00:00Z',
    newsletter_type: MOCK_NEWSLETTER_TYPES[1],
  },
];

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
    let filtered = MOCK_MVPS.filter(mvp => mvp.status === 'approved');

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        mvp =>
          mvp.title.toLowerCase().includes(searchLower) ||
          mvp.tagline.toLowerCase().includes(searchLower) ||
          mvp.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.category && filters.category !== 'All') {
      filtered = filtered.filter(mvp => mvp.category === filters.category);
    }

    if (filters?.techStack && filters.techStack.length > 0) {
      filtered = filtered.filter(mvp =>
        filters.techStack!.every(tech => mvp.tech_stack.includes(tech))
      );
    }

    if (filters?.minPrice !== undefined) {
      filtered = filtered.filter(mvp => (mvp.price || 0) >= filters.minPrice!);
    }

    if (filters?.maxPrice !== undefined) {
      filtered = filtered.filter(mvp => (mvp.price || 0) <= filters.maxPrice!);
    }

    if (filters?.licensingTerms && filters.licensingTerms !== 'all') {
      filtered = filtered.filter(mvp => mvp.licensing_terms === filters.licensingTerms);
    }

    if (filters?.sortBy) {
      filtered.sort((a, b) => {
        if (filters.sortBy === 'published_at') {
          return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
        } else if (filters.sortBy === 'download_count') {
          return b.download_count - a.download_count;
        } else if (filters.sortBy === 'average_rating') {
          return b.average_rating - a.average_rating;
        }
        return 0;
      });
    }

    const total = filtered.length;
    const start = (filters?.page || 0) * (filters?.limit || 20);
    const end = start + (filters?.limit || 20);
    const paginated = filtered.slice(start, end);

    return { mvps: paginated, total };
  }

  static async getMVPById(id: string): Promise<MVP | null> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    const mvp = MOCK_MVPS.find(m => m.id === id || m.slug === id);
    if (mvp) {
      // In a real app, fetch seller details from profiles table
      const { data: seller, error } = await supabase
        .from('profiles')
        .select('id, email, username')
        .eq('id', mvp.seller_id)
        .single();

      if (error) {
        console.error('Error fetching seller for MVP:', error);
        return { ...mvp, seller: undefined };
      }
      return { ...mvp, seller: seller || undefined };
    }
    return null;
  }

  static async downloadMVP(mvpId: string, userId: string): Promise<{ success: boolean; message: string; filePath?: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mvp = MOCK_MVPS.find(m => m.id === mvpId);
    if (!mvp) {
      return { success: false, message: 'MVP not found.' };
    }

    // Simulate user profile and quota check
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('downloads_remaining, is_seller_approved, role')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return { success: false, message: 'User profile not found. Please log in again.' };
    }

    // Beta user has unlimited downloads
    if (userId === 'beta-user-123') {
      console.log('Beta user detected, unlimited downloads.');
      // Simulate download record creation
      await supabase.from('downloads').insert({
        user_id: userId,
        mvp_id: mvpId,
        month_year: new Date().toISOString().substring(0, 7),
      });
      return { success: true, message: 'Download initiated!', filePath: `/mock-downloads/${mvp.slug}.zip` };
    }

    if (userProfile.downloads_remaining <= 0) {
      return { success: false, message: 'You have reached your download quota. Please upgrade your plan.' };
    }

    // Simulate download record creation and quota decrement
    const { error: downloadError } = await supabase.from('downloads').insert({
      user_id: userId,
      mvp_id: mvpId,
      month_year: new Date().toISOString().substring(0, 7),
    });

    if (downloadError) {
      console.error('Error creating download record:', downloadError);
      return { success: false, message: 'Failed to record download. Please try again.' };
    }

    const { error: updateError } = await supabase.from('profiles').update({
      downloads_remaining: userProfile.downloads_remaining - 1,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);

    if (updateError) {
      console.error('Error updating download quota:', updateError);
      // Even if quota update fails, allow download for now
    }

    return { success: true, message: 'Download initiated!', filePath: `/mock-downloads/${mvp.slug}.zip` };
  }

  static async getMVPReviews(mvpId: string): Promise<Review[]> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    const reviews = MOCK_REVIEWS.filter(review => review.mvp_id === mvpId);

    // In a real app, fetch user details for each review
    const reviewsWithUsers = await Promise.all(reviews.map(async (review) => {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('email, username')
        .eq('id', review.user_id)
        .single();
      if (error) {
        console.error('Error fetching user for review:', error);
        return { ...review, user: undefined };
      }
      return { ...review, user: user || undefined };
    }));

    return reviewsWithUsers;
  }

  static async submitReview(reviewData: { mvpId: string; userId: string; rating: number; comment: string }): Promise<{ success: boolean; message: string; review?: Review }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (reviewData.rating < 1 || reviewData.rating > 5) {
      return { success: false, message: 'Rating must be between 1 and 5.' };
    }

    // Simulate database insert
    const newReview: Review = {
      id: `review-${MOCK_REVIEWS.length + 1}`,
      user_id: reviewData.userId,
      mvp_id: reviewData.mvpId,
      rating: reviewData.rating,
      review_text: reviewData.comment,
      created_at: new Date().toISOString(),
      is_verified_buyer: true, // Simulate verified buyer
      user: { email: 'currentuser@example.com' } // Mock current user
    };
    MOCK_REVIEWS.push(newReview);

    // Simulate updating MVP average rating
    const mvp = MOCK_MVPS.find(m => m.id === reviewData.mvpId);
    if (mvp) {
      const mvpReviews = MOCK_REVIEWS.filter(r => r.mvp_id === mvp.id);
      const totalRating = mvpReviews.reduce((sum, r) => sum + r.rating, 0);
      mvp.average_rating = parseFloat((totalRating / mvpReviews.length).toFixed(1));
    }

    return { success: true, message: 'Review submitted successfully!', review: newReview };
  }

  static async getUserDownloads(userId: string): Promise<Download[]> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_DOWNLOADS.filter(dl => dl.user_id === userId);
  }

  static async getTotalMVPs(): Promise<number> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return MOCK_MVPS.filter(mvp => mvp.status === 'approved').length;
  }

  static async getTotalDeployments(): Promise<number> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    // In a real app, this would query the 'deployments' table
    return 12345; // Mock value
  }

  static async createStripeConnectAccountLink(userId: string): Promise<{ success: boolean; message: string; accountLinkUrl?: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 500));

    // In a real scenario, this would call your Supabase Edge Function
    // which then calls Stripe API to create an account link.
    // For mock, we return a dummy URL.
    const mockAccountLinkUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_mock_client_id&scope=read_write&state=${userId}`;

    return {
      success: true,
      message: 'Stripe Connect account link created successfully.',
      accountLinkUrl: mockAccountLinkUrl
    };
  }

  static async getSellerPayouts(sellerId: string): Promise<any[]> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock data for payouts
    const mockPayouts = [
      {
        id: 'payout-1',
        month_year: '2024-01',
        total_downloads: 50,
        commission_amount: 125.00,
        platform_fee_deducted: 37.50,
        status: 'completed',
        created_at: '2024-02-01T00:00:00Z',
        processed_at: '2024-02-05T00:00:00Z',
      },
      {
        id: 'payout-2',
        month_year: '2024-02',
        total_downloads: 75,
        commission_amount: 187.50,
        platform_fee_deducted: 56.25,
        status: 'pending',
        created_at: '2024-03-01T00:00:00Z',
        processed_at: null,
      },
    ];

    return mockPayouts;
  }

  static async submitRefundRequest(requestData: {
    userId: string;
    subscriptionId: string;
    reason: string;
    amountRequested: number;
  }): Promise<{ success: boolean; message: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 500));

    const newRefundRequest: RefundRequest = {
      id: uuidv4(),
      user_id: requestData.userId,
      subscription_id: requestData.subscriptionId,
      reason: requestData.reason,
      amount_requested: requestData.amountRequested,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    MOCK_REFUND_REQUESTS.push(newRefundRequest);

    return { success: true, message: 'Refund request submitted successfully. We will review it shortly.' };
  }

  static async getUserRefundRequests(userId: string): Promise<RefundRequest[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_REFUND_REQUESTS.filter(req => req.user_id === userId);
  }

  static async submitDispute(disputeData: {
    buyerId: string;
    sellerId: string;
    mvpId: string;
    reason: string;
    details: string;
  }): Promise<{ success: boolean; message: string }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    const newDispute: Dispute = {
      id: uuidv4(),
      buyer_id: disputeData.buyerId,
      seller_id: disputeData.sellerId,
      mvp_id: disputeData.mvpId,
      reason: disputeData.reason,
      details: disputeData.details,
      status: 'open',
      opened_at: new Date().toISOString(),
    };
    MOCK_DISPUTES.push(newDispute);

    return { success: true, message: 'Dispute submitted successfully. We will review it shortly.' };
  }

  static async getUserDisputes(userId: string): Promise<Dispute[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_DISPUTES.filter(d => d.buyer_id === userId || d.seller_id === userId);
  }

  static async getDisputeById(disputeId: string): Promise<Dispute | null> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    const dispute = MOCK_DISPUTES.find(d => d.id === disputeId);

    if (dispute) {
      // Populate buyer, seller, and MVP details
      const buyerProfile = await supabase.from('profiles').select('email, username').eq('id', dispute.buyer_id).single();
      const sellerProfile = await supabase.from('profiles').select('email, username').eq('id', dispute.seller_id).single();
      const mvpDetails = MOCK_MVPS.find(m => m.id === dispute.mvp_id);

      return {
        ...dispute,
        buyer: buyerProfile.data || undefined,
        seller: sellerProfile.data || undefined,
        mvp: mvpDetails ? { title: mvpDetails.title, slug: mvpDetails.slug } : undefined,
      };
    }
    return null;
  }
}

export class NotificationService {
  static async getNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    let userNotifications = MOCK_NOTIFICATIONS.filter(n => n.user_id === userId);
    if (unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.read);
    }
    return userNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getUnreadNotificationCount(userId: string): Promise<number> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return MOCK_NOTIFICATIONS.filter(n => n.user_id === userId && !n.read).length;
  }

  static async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200));
    const notification = MOCK_NOTIFICATIONS.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return { success: true };
    }
    return { success: false, error: 'Notification not found' };
  }

  static async markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    MOCK_NOTIFICATIONS.forEach(n => {
      if (n.user_id === userId) {
        n.read = true;
      }
    });
    return { success: true };
  }

  static async createNotification(notificationData: Omit<Notification, 'id' | 'read' | 'created_at'>): Promise<{ success: boolean; error?: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    const newNotification: Notification = {
      id: uuidv4(),
      read: false,
      created_at: new Date().toISOString(),
      ...notificationData
    };
    MOCK_NOTIFICATIONS.push(newNotification);
    return { success: true };
  }
}

export class GitHubService {
  static async validateGitHubRepository(owner: string, repoName: string, userId: string): Promise<{ success: boolean; message: string; repoData?: any }> {
    // Simulate API call to GitHub via Edge Function
    await new Promise(resolve => setTimeout(resolve, 500));

    // In a real scenario, this would call your Supabase Edge Function
    // which then calls GitHub API to validate the repo.
    // For mock, we return success if repoName is not 'invalid'
    if (repoName.toLowerCase() === 'invalid') {
      return { success: false, message: 'Repository not found or not accessible.' };
    }

    return {
      success: true,
      message: 'Repository found and accessible!',
      repoData: {
        full_name: `${owner}/${repoName}`,
        description: 'A mock repository for testing purposes.',
        stargazers_count: 100,
        forks_count: 20,
        private: false,
      }
    };
  }

  static async linkGitHubRepository(mvpId: string, userId: string, owner: string, repoName: string, webhookSecret: string): Promise<{ success: boolean; message: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 500));

    // In a real scenario, this would call your Supabase Edge Function
    // to update the MVP record with GitHub details and webhook secret.
    const mvp = MOCK_MVPS.find(m => m.id === mvpId);
    if (mvp) {
      mvp.github_repo_owner = owner;
      mvp.github_repo_name = repoName;
      mvp.github_webhook_secret = webhookSecret;
      mvp.github_url = `https://github.com/${owner}/${repoName}`;
      return { success: true, message: 'GitHub repository linked successfully!' };
    }
    return { success: false, message: 'MVP not found.' };
  }

  static async unlinkGitHubRepository(mvpId: string): Promise<{ success: boolean; message: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 500));

    const mvp = MOCK_MVPS.find(m => m.id === mvpId);
    if (mvp) {
      mvp.github_repo_owner = undefined;
      mvp.github_repo_name = undefined;
      mvp.github_webhook_secret = undefined;
      mvp.github_url = undefined;
      mvp.last_synced_github_commit_sha = undefined;
      return { success: true, message: 'GitHub repository unlinked successfully.' };
    }
    return { success: false, message: 'MVP not found.' };
  }

  static async completeGitHubAppInstallation(code: string, installationId: number, userId: string): Promise<{ success: boolean; message: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In a real scenario, this would call your Supabase Edge Function
    // to exchange the code for a token and update the user's profile
    // with the installationId.
    console.log(`Mock: Completing GitHub App installation for user ${userId} with installation ID ${installationId}`);

    // Simulate updating the user's profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({ github_app_installation_id: installationId })
      .eq('id', userId);

    if (error) {
      console.error('Mock: Error updating user profile with GitHub App installation ID:', error);
      return { success: false, message: 'Failed to update user profile with GitHub App installation ID.' };
    }

    return { success: true, message: 'GitHub App installed and linked to your profile successfully!' };
  }

  static async getLatestRepositoryInfo(owner: string, repoName: string, userId: string): Promise<{ success: boolean; message: string; data?: any }> {
    // Simulate API call to GitHub via Edge Function
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock data for latest commit/release
    return {
      success: true,
      message: 'Fetched latest repository info.',
      data: {
        commit_sha: 'mocksha1234567890abcdef',
        message: 'feat: Add new feature and fix bugs',
        type: 'commit',
        zipball_url: `/mock-downloads/${repoName}-latest.zip`,
      }
    };
  }
}

export class DeploymentService {
  static async startDeployment(userId: string, mvpId: string, repoName: string): Promise<{ success: boolean; message: string; github_auth_url?: string; deployment_id?: string }> {
    // 1. Create initial deployment record in Supabase
    const { data: newDeployment, error: insertError } = await supabase
      .from('deployments')
      .insert({
        user_id: userId,
        mvp_id: mvpId,
        repo_name: repoName,
        status: 'initializing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !newDeployment) {
      console.error('Error creating initial deployment record:', insertError);
      return { success: false, message: 'Failed to start deployment: Could not create initial record.' };
    }

    const deploymentId = newDeployment.id;
    console.log(`Initial deployment record created with ID: ${deploymentId}`);

    // 2. Initiate GitHub OAuth flow, passing the deployment_id
    try {
      const { data, error } = await supabase.functions.invoke('initiate-buyer-github-oauth', {
        body: {
          user_id: userId,
          mvp_id: mvpId,
          deployment_id: deploymentId, // Pass the deployment_id
        },
      });

      if (error) {
        console.error('Error invoking initiate-buyer-github-oauth:', error);
        // Update deployment status to failed if the initiation fails
        await supabase.from('deployments').update({
          status: 'failed',
          error_message: error.message || 'Failed to initiate GitHub OAuth',
          updated_at: new Date().toISOString(),
        }).eq('id', deploymentId);
        return { success: false, message: error.message || 'Failed to initiate GitHub authentication.' };
      }

      if (data?.github_auth_url) {
        return {
          success: true,
          message: 'Redirecting to GitHub for authentication...',
          github_auth_url: data.github_auth_url,
          deployment_id: deploymentId, // Return deployment_id
        };
      } else {
        // This case should ideally not happen if the Edge Function works as expected
        // but good for defensive programming.
        await supabase.from('deployments').update({
          status: 'failed',
          error_message: 'GitHub auth URL not returned from initiate-buyer-github-oauth',
          updated_at: new Date().toISOString(),
        }).eq('id', deploymentId);
        return { success: false, message: 'Failed to get GitHub authentication URL.' };
      }
    } catch (error: any) {
      console.error('Unexpected error during startDeployment:', error);
      await supabase.from('deployments').update({
        status: 'failed',
        error_message: error.message || 'An unexpected error occurred during deployment initiation.',
        updated_at: new Date().toISOString(),
      }).eq('id', deploymentId);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }

  static async completeGitHubAuth(code: string, state: string): Promise<{ success: boolean; message: string; github_username?: string; mvp_id?: string; deployment_id?: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const { data, error } = await supabase.functions.invoke('handle-buyer-github-callback', {
        body: { code, state },
      });

      if (error) {
        console.error('Error invoking handle-buyer-github-callback:', error);
        return { success: false, message: error.message || 'Failed to complete GitHub authentication.' };
      }

      return {
        success: true,
        message: 'GitHub authentication successful!',
        github_username: data?.github_username,
        mvp_id: data?.mvp_id,
        deployment_id: data?.deployment_id,
      };
    } catch (error: any) {
      console.error('Error in completeGitHubAuth:', error);
      return { success: false, message: error.message || 'An unexpected error occurred during GitHub authentication.' };
    }
  }

  static async createRepoAndPushMVP(userId: string, mvpId: string, deploymentId: string, repoName: string): Promise<{ success: boolean; message: string; github_repo_url?: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 1000));

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
        console.error('Error invoking create-buyer-repo-and-push-mvp:', error);
        return { success: false, message: error.message || 'Failed to create repository and push MVP.' };
      }

      return {
        success: true,
        message: 'GitHub repository created and MVP code pushed!',
        github_repo_url: data?.github_repo_url,
      };
    } catch (error: any) {
      console.error('Error in createRepoAndPushMVP:', error);
      return { success: false, message: error.message || 'An unexpected error occurred during repository creation.' };
    }
  }

  static async initiateNetlifyAuth(userId: string, deploymentId: string, githubRepoUrl: string): Promise<{ success: boolean; message: string; netlify_auth_url?: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const { data, error } = await supabase.functions.invoke('initiate-netlify-oauth', {
        body: {
          user_id: userId,
          deployment_id: deploymentId,
          github_repo_url: githubRepoUrl,
        },
      });

      if (error) {
        console.error('Error invoking initiate-netlify-oauth:', error);
        return { success: false, message: error.message || 'Failed to initiate Netlify authentication.' };
      }

      return {
        success: true,
        message: 'Redirecting to Netlify for authentication...',
        netlify_auth_url: data?.netlify_auth_url,
      };
    } catch (error: any) {
      console.error('Error in initiateNetlifyAuth:', error);
      return { success: false, message: error.message || 'An unexpected error occurred during Netlify authentication.' };
    }
  }

  static async completeNetlifyAuth(code: string, state: string): Promise<{ success: boolean; message: string; netlify_site_url?: string; deployment_id?: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const { data, error } = await supabase.functions.invoke('handle-netlify-callback', {
        body: { code, state },
      });

      if (error) {
        console.error('Error invoking handle-netlify-callback:', error);
        return { success: false, message: error.message || 'Failed to complete Netlify authentication.' };
      }

      return {
        success: true,
        message: 'Netlify site deployed successfully!',
        netlify_site_url: data?.site_url,
        deployment_id: data?.deployment_id,
      };
    } catch (error: any) {
      console.error('Error in completeNetlifyAuth:', error);
      return { success: false, message: error.message || 'An unexpected error occurred during Netlify deployment.' };
    }
  }

  static async getDeploymentStatus(deploymentId: string): Promise<{ status: string; netlify_site_url?: string; error_message?: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const { data, error } = await supabase.functions.invoke('get-deployment-status', {
        body: { id: deploymentId },
      });

      if (error) {
        console.error('Error invoking get-deployment-status:', error);
        return { status: 'failed', error_message: error.message || 'Failed to fetch deployment status.' };
      }

      return {
        status: data?.status || 'unknown',
        netlify_site_url: data?.netlify_site_url,
        error_message: data?.error_message,
      };
    } catch (error: any) {
      console.error('Error in getDeploymentStatus:', error);
      return { status: 'failed', error_message: error.message || 'An unexpected error occurred while fetching deployment status.' };
    }
  }

  static async getUserDeployments(userId: string): Promise<{ success: boolean; deployments?: any[]; message?: string }> {
    // Simulate API call to Supabase
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const { data, error } = await supabase
        .from('deployments')
        .select(`
          *,
          mvps(title, preview_images)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user deployments:', error);
        return { success: false, message: error.message || 'Failed to fetch user deployments.' };
      }

      return { success: true, deployments: data || [] };
    } catch (error: any) {
      console.error('Error in getUserDeployments:', error);
      return { success: false, message: error.message || 'An unexpected error occurred while fetching user deployments.' };
    }
  }

  static async initiateGeneralGitHubAuth(userId: string): Promise<{ success: boolean; message: string; github_auth_url?: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const { data, error } = await supabase.functions.invoke('initiate-github-oauth', {
        body: { user_id: userId },
      });

      if (error) {
        console.error('Error invoking initiate-github-oauth:', error);
        return { success: false, message: error.message || 'Failed to initiate GitHub authentication.' };
      }

      return {
        success: true,
        message: 'Redirecting to GitHub for authentication...',
        github_auth_url: data?.github_auth_url,
      };
    } catch (error: any) {
      console.error('Error in initiateGeneralGitHubAuth:', error);
      return { success: false, message: error.message || 'An unexpected error occurred during GitHub authentication.' };
    }
  }
}

export class MarketingService {
  static async processLeadCapture(email: string, agreedToTerms: boolean): Promise<{ success: boolean; message: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const { data, error } = await supabase.functions.invoke('process-lead-capture', {
        body: { email, agreed_to_terms: agreedToTerms, source: 'lead_modal' },
      });

      if (error) {
        console.error('Error invoking process-lead-capture:', error);
        return { success: false, message: error.message || 'Failed to process lead capture.' };
      }

      return {
        success: true,
        message: data?.message || 'Thank you for subscribing! Check your inbox for updates.',
      };
    } catch (error: any) {
      console.error('Error in processLeadCapture:', error);
      return { success: false, message: error.message || 'An unexpected error occurred during lead capture.' };
    }
  }
}

export class NewsletterService {
  static async getAllNewsletterTypes(): Promise<NewsletterType[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_NEWSLETTER_TYPES;
  }

  static async createNewsletterType(newsletterType: Omit<NewsletterType, 'id' | 'created_at'>): Promise<{ success: boolean; message: string; newsletterType?: NewsletterType }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const newType: NewsletterType = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      ...newsletterType,
    };
    MOCK_NEWSLETTER_TYPES.push(newType);
    return { success: true, message: 'Newsletter type created successfully', newsletterType: newType };
  }

  static async updateNewsletterType(id: string, updates: Partial<Omit<NewsletterType, 'id' | 'created_at'>>): Promise<{ success: boolean; message: string }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = MOCK_NEWSLETTER_TYPES.findIndex(type => type.id === id);
    if (index !== -1) {
      MOCK_NEWSLETTER_TYPES[index] = { ...MOCK_NEWSLETTER_TYPES[index], ...updates };
      return { success: true, message: 'Newsletter type updated successfully' };
    }
    return { success: false, message: 'Newsletter type not found' };
  }

  static async deleteNewsletterType(id: string): Promise<{ success: boolean; message: string }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const initialLength = MOCK_NEWSLETTER_TYPES.length;
    MOCK_NEWSLETTER_TYPES.splice(MOCK_NEWSLETTER_TYPES.findIndex(type => type.id === id), 1);
    if (MOCK_NEWSLETTER_TYPES.length < initialLength) {
      return { success: true, message: 'Newsletter type deleted successfully' };
    }
    return { success: false, message: 'Newsletter type not found' };
  }

  static async getAllUserSubscriptions(): Promise<UserNewsletterSubscription[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_USER_NEWSLETTER_SUBSCRIPTIONS;
  }

  static async getUserSubscriptions(userId: string): Promise<UserNewsletterSubscription[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_USER_NEWSLETTER_SUBSCRIPTIONS.filter(sub => sub.user_id === userId);
  }

  static async subscribeToNewsletter(userId: string, newsletterTypeId: string, email: string, source?: string): Promise<{ success: boolean; message: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const { data, error } = await supabase.functions.invoke('subscribe-to-newsletter', {
        body: { user_id: userId, newsletter_type_id: newsletterTypeId, email, source },
      });
      if (error) throw error;
      return { success: true, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to subscribe.' };
    }
  }

  static async unsubscribeFromNewsletter(userId: string, newsletterTypeId: string, email: string): Promise<{ success: boolean; message: string }> {
    // Simulate API call to Edge Function
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const { data, error } = await supabase.functions.invoke('unsubscribe-from-newsletter', {
        body: { user_id: userId, newsletter_type_id: newsletterTypeId, email },
      });
      if (error) throw error;
      return { success: true, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to unsubscribe.' };
    }
  }

  static async getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_NEWSLETTER_SUBSCRIBERS;
  }

  static async exportSubscribersList(format: 'csv' | 'json'): Promise<string> {
    // Simulate export logic
    await new Promise(resolve => setTimeout(resolve, 500));
    if (format === 'json') {
      return JSON.stringify(MOCK_NEWSLETTER_SUBSCRIBERS, null, 2);
    } else {
      const headers = 'id,email,source,agreed_to_terms,subscribed_at,last_modified_at,unsubscribed_at,categories\n';
      const rows = MOCK_NEWSLETTER_SUBSCRIBERS.map(sub =>
        `${sub.id},${sub.email},${sub.source || ''},${sub.agreed_to_terms},${sub.subscribed_at},${sub.last_modified_at},${sub.unsubscribed_at || ''},"${sub.categories?.join('|') || ''}"`
      ).join('\n');
      return headers + rows;
    }
  }
}