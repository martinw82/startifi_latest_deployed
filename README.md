# MVP Library Platform

A premium marketplace for AI-ready MVP codebases that accelerates development for entrepreneurs, developers, and agencies. Our platform offers a curated library of high-quality, production-ready templates optimized for AI integration.

## 🎯 Project Vision

The MVP Library Platform is designed to be the go-to marketplace where developers can:
- **Buy**: Access production-ready MVP templates optimized for AI integration
- **Sell**: Monetize their expertise by selling high-quality MVP codebases
- **Scale**: Accelerate development cycles from months to days

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for development and building
- **Tailwind CSS** for styling with custom glass morphism design
- **Framer Motion** for animations
- **Lucide React** for icons
- **React Router DOM** for navigation

### Backend & Database
- **Supabase** for authentication, database, and real-time features
- **PostgreSQL** with Row Level Security (RLS)
- **Stripe** for payments and subscriptions (planned)

### Development Tools
- **ESLint** for code linting
- **TypeScript** for type safety
- **PostCSS** with Autoprefixer

## 📊 Current Implementation Status

### ✅ Completed Features

#### Core Infrastructure
- [x] Project setup with Vite, React 18, and TypeScript
- [x] Custom glass morphism design system with Tailwind CSS
- [x] Fully responsive layout with smooth dark/light theme toggle
- [x] Component architecture with reusable UI components (GlassCard, GlossyButton, etc.)

#### Database & Authentication
- [x] Comprehensive database schema with 15+ tables
- [x] Secure Row Level Security (RLS) policies for all tables
- [x] User authentication with Supabase Auth
- [x] Profile management with multiple roles (buyer/seller/admin/both)
- [x] **FIXED**: PGRST116 error handling for existing users without profiles

#### User Interface
- [x] Dynamic landing page with hero section and featured MVPs
- [x] Authentication system with sign-in, sign-up, and password recovery
- [x] Advanced MVP listing with multi-criteria filtering (category, tech stack, price range, licensing)
- [x] Subscription-based pricing page with Stripe integration
- [x] Role-based dashboards (buyer, seller, admin)
- [x] Responsive navigation with mobile support

#### MVP Detail Pages
- [x] Comprehensive MVP showcase with dynamic routing
- [x] Interactive image galleries with thumbnails
- [x] Quota-based download system with tracking
- [x] Review and rating system with verified buyer badges

#### MVP Management & User Interaction
- [x] File upload system with security scanning
- [x] Multi-step MVP submission workflow
- [x] Seller portfolio management with status tracking
- [x] GitHub integration for automatic updates
- [x] Netlify integration for one-click deployment
- [x] Version tracking and changelog management
- [x] Notification system for platform activities
- [x] Dispute resolution system for buyers and sellers
- [x] Refund request management

#### Authentication & User Management Enhancements
- [x] **Beta account for testing with full access (beta/beta)**
- [x] **Seller signup page with multi-step form**
- [x] **Fixed login navigation to prevent 404 errors**
- [x] **Fixed admin dashboard routing issues**

#### Stripe Integration
- [x] **Full Stripe integration for subscriptions and seller payouts**
- [x] **Stripe Connect for seller onboarding and payouts**
- [x] **Automated commission calculations (70/30 revenue split)**
- [x] **Complete payment webhook system and subscription management**

#### Admin Dashboard & Platform Management
- [x] **Comprehensive admin dashboard with role-based access**
- [x] **MVP approval workflow and content moderation tools**
- [x] **User management and activity monitoring**
- [x] **Platform analytics and statistics**

### 🚧 Recently Completed

#### GitHub & Netlify Integration
- [x] GitHub App integration for automatic MVP updates
- [x] Private repository support with secure token handling
- [x] One-click deployment to Netlify from MVP details page
- [x] OAuth authentication flow for GitHub and Netlify
- [x] Deployment status tracking and monitoring

#### Enhanced User Features
- [x] User profiles with social links and portfolio information
- [x] Seller profile pages with published MVPs
- [x] Real-time notification system for platform activities
- [x] Dispute resolution system for conflict management
- [x] Refund request workflow with admin approval

### 📋 Priority Roadmap

#### High Priority (Next 2-4 weeks)

1. **Complete GitHub/Netlify Integration** 🚀
   - External worker system for handling large file uploads
   - Improved error handling and retry mechanisms
   - Enhanced deployment logging and monitoring
   - Support for custom domain configuration

2. **Enhanced Seller Analytics** 📊
   - Advanced performance tracking dashboard
   - Revenue forecasting and trend analysis
   - Customer feedback aggregation and insights
   - Download and usage statistics

#### Medium Priority (1-2 months)

3. **Community Features** 👥
   - User collections and favorites
   - Collaborative project support
   - Public user profiles and activity feeds
   - Follow system for sellers and MVPs

4. **Advanced Search and Discovery** 🔍
   - AI-powered MVP recommendations
   - Advanced search with semantic understanding
   - Related MVPs suggestions
   - Personalized discovery feed

#### Low Priority (Future releases)

5. **Platform Optimization** ⚙️
   - Performance improvements for large deployments
   - SEO enhancements for public pages
   - Advanced analytics integration
   - A/B testing framework for UX improvements

## 🗄️ Database Schema Overview

The platform uses a comprehensive PostgreSQL schema with the following key tables:

- **profiles**: User profiles extending Supabase auth
  - Extended with social links, profile information, and integration IDs

- **subscriptions**: User subscription plans and billing
  - Tracks quotas, periods, and subscription status

- **mvps**: MVP listings with metadata and files
  - Includes GitHub repository info, version history, and deployment details

- **downloads**: Download tracking for quota management
  - Records all user downloads with monthly quotas

- **reviews**: User reviews and ratings
  - Support for verified buyer badges and ratings

- **notifications**: System notifications
  - Real-time user notifications for platform activities

- **payouts**: Seller commission tracking
  - Automated monthly payouts with status tracking

- **refund_requests**: Subscription refund handling
  - Complete workflow for refund management

- **disputes**: Buyer-seller dispute resolution
  - Comprehensive dispute resolution system

- **audit_logs**: System audit trail
  - Security and compliance tracking

- **deployments**: Netlify deployment tracking
  - One-click deployment with GitHub integration

- **oauth_tokens**: Secure storage for GitHub and Netlify tokens
  - Integration with third-party services

All tables feature Row Level Security (RLS) with comprehensive policies for data protection.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Git

### Setup Instructions

1. **Clone and Install**
```bash
git clone <repository-url>
cd mvp-library-platform
npm install
```

2. **Environment Setup**
Create a `.env` file with your Supabase credentials and other environment variables:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# GitHub App Configuration
VITE_GITHUB_APP_SLUG=your-github-app-slug

# Stripe (if manually configuring)
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

3. **Database Setup**
```bash
# All migrations have been applied to your Supabase project
# No additional steps required
```

4. **Start Development**
```bash
npm run dev
```

### Important Notes for Developers

#### Authentication Fix (PGRST116 Error)
- **Issue**: Existing users from before profile creation might not have profile records
- **Solution**: The `getCurrentUser()` method now automatically creates missing profiles
- **Status**: ✅ FIXED - Automatic profile creation implemented

#### RLS Policies
- All database operations are protected by Row Level Security (RLS)
- Admin functions use `SECURITY DEFINER` to prevent recursion
- The secure `is_admin()` function handles admin access checks

#### GitHub/Netlify Integration
- Initial integration is complete and functional
- Supabase Edge Functions faced size/memory constraints
- Final implementation will use external worker system for processing large files
- OAuth-based authentication for both GitHub and Netlify

#### Component Architecture
- Use `GlassCard` for consistent glass morphism design
- Use `GlossyButton` for all interactive elements
- Follow the established color scheme and spacing system

### Recent Refinements by ~jules~  (please refer to jules_readme.md file for full and specific and uptodate information about upgrades and bug fixes done by jules)
The following is a summary of key activities performed by ~jules~:
*   **SPA Navigation Overhaul**: Corrected a core bug by refactoring navigation across key components (`Header.tsx`, `Footer.tsx`, `BuyerDashboardPage.tsx`, `SellerDashboardPage.tsx`) from direct `window.location.href` calls to `Link` components from `react-router-dom`. This ensures a true single-page application experience, preventing full page reloads.
*   **Placeholder Route Implementation**: Established a robust routing setup by defining numerous placeholder routes in `src/App.tsx` and creating a generic `PlaceholderPage.tsx` to handle these, ensuring all anticipated navigation links are functional.
*   **Link Destination Verification**: Confirmed with user input that all previously ambiguous links (e.g., `/support`, `/contact`) should indeed be treated as internal SPA routes, validating the current placeholder setup.
*   **Auth & Data Fetching Code Review**: Conducted a comprehensive review of authentication and data fetching logic (`auth.ts`, `useAuth.ts`, `api.ts`, dashboard pages). Provided a detailed report with findings on overall health, strengths (resilient auth core, centralized API), and areas for improvement (mock data usage, user error handling, RLS testing, placeholder logic in API).
*   **MVP Detail Pages (Complete Implementation)**:
    *   Scaffolded `MVPDetailPage.tsx` with dynamic routing and comprehensive MVP showcase
    *   Created interactive `MVPImageGallery.tsx` with main image and thumbnails
    *   Implemented full download functionality with quota checking and tracking
    *   Built review and rating submission system (`SubmitReviewForm.tsx`, `APIService.submitReview`)
    *   Enhanced review system with verified buyer badges
    *   Added notifications for sellers when their MVPs are downloaded or reviewed
*   **Seller Registration & Upload System**:
    *   Created `SellerSignupPage.tsx` with multi-step form for seller application
    *   Implemented comprehensive MVP upload system (`UploadMVPPage.tsx`, `MVPUploadService`)
    *   Built `MyMVPsPage.tsx` for seller portfolio management with status filtering
    *   Added demo MVP "AI-Powered SaaS Starter Kit" for platform showcase
    *   Implemented seller profile pages for public viewing
    *   Added social profile links and portfolio information
*   **Admin Dashboard Implementation**:
    *   Created `AdminDashboardPage.tsx` with role-based access control
    *   Implemented tabbed interface with Overview, MVP Reviews, User Management, and Analytics
    *   Added MVP approval queue with approve/reject functionality
    *   Fixed routing issues for `/admin` route to prevent 404 errors
*   **Beta Account & System Enhancements**:
    *   Implemented special `beta/beta` user with full buyer/seller/admin access
    *   Added easy "Beta Access" button to authentication page
    *   Fixed login navigation using `useNavigate` to prevent 404 issues
    *   Resolved build errors (CSS import order, component exports, Browserslist update)
*   **Comprehensive Notification System**:
    *   Real-time notifications for platform activities
    *   Unread notification count in header
    *   Mark-as-read functionality
    *   Notification filtering
*   **Dispute Resolution System**:
    *   Complete buyer-seller dispute workflow
    *   Detailed dispute tracking and history
    *   Resolution status updates
    *   Admin review interface
*   **Refund Request System**:
    *   Subscription refund request workflow
    *   Request history and status tracking
    *   Admin approval interface
*   15/06/25 - Fixed build errors related to CSS import order and component export. Updated Browserslist.
~jules~

## 🎨 Design System

The platform uses a custom glass morphism design with:
- **Colors**: Blue to purple gradients with glass effects
- **Typography**: Inter font family with proper hierarchy
- **Components**: Reusable glass cards, buttons, and form elements
- **Animations**: Framer Motion for smooth interactions
- **Responsive**: Mobile-first design with Tailwind breakpoints

## 🔐 Security Considerations

- All API calls protected by RLS policies
- Comprehensive input validation on both client and server
- Secure file upload with validation
- Edge Functions for sensitive operations
- Secure token handling for third-party integrations
- Webhook signature verification for GitHub and Stripe

## 📈 Business Model

- **Subscription-based**: Monthly plans for buyers
- **Commission-based**: Revenue sharing with sellers
- **Freemium**: Limited free tier to attract users
- **Enterprise**: Custom solutions for large organizations

## 🤝 Contributing

This is a production-ready platform with comprehensive features. When contributing:
1. Follow the established code patterns
2. Test all authentication flows thoroughly
3. Ensure RLS policies are working correctly
4. Maintain the glass morphism design consistency
5. Update this README with any significant changes

## 📞 Support

For development questions or issues:
- Debug using detailed console logs throughout the codebase
- Verify Supabase connection status and RLS policies
- Test with the beta account (beta/beta) for full access
- Check the database schema for complete data relationships

---

**Current Status**: All core features implemented. GitHub/Netlify integration complete with external worker pending.
**Next Priority**: Implement external worker system for handling large file uploads and deployments.
**Last Updated**: January 2025 - Added comprehensive dispute resolution and refund systems
