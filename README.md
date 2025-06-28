# MVP Library Platform

A premium marketplace for AI-ready MVP codebases that accelerates development for entrepreneurs, developers, and agencies.

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
- [x] Project setup with Vite + React + TypeScript
- [x] Tailwind CSS with custom glass morphism design system
- [x] Responsive layout with dark/light theme support
- [x] Component architecture with reusable UI components

#### Database & Authentication
- [x] Complete database schema with 10+ tables
- [x] Row Level Security (RLS) policies for all tables
- [x] User authentication with Supabase Auth
- [x] Profile management system with roles (buyer/seller/admin)
- [x] **FIXED**: PGRST116 error handling for existing users without profiles

#### User Interface
- [x] Landing page with hero section and featured MVPs
- [x] Authentication pages (sign in/sign up) with role selection
- [x] MVP listing page with advanced filtering
- [x] Pricing page with subscription tiers
- [x] Dashboard routing (buyer vs seller dashboards)
- [x] Responsive navigation with mobile menu

#### MVP Management
- [x] Mock data for development and testing

#### Authentication & User Management Enhancements
- [x] **Beta account for testing with full access (beta/beta)**
- [x] **Seller signup page with multi-step form**
- [x] **Fixed login navigation to prevent 404 errors**
- [x] **Fixed admin dashboard routing issues**

#### Stripe Integration
- [x] **Full Stripe integration for subscriptions and seller payouts**
- [x] **Stripe Connect for seller onboarding and payouts**
- [x] **Automated payout processing with commission calculations**
- [x] **Payment webhook handling and subscription management**
### 🚧 In Progress

#### Dashboard Implementation
- [x] Buyer dashboard with subscription status and download history
- [x] Seller dashboard with MVP management and earnings
- [ ] Admin dashboard for platform management
### 📋 Priority Roadmap

#### High Priority (Next 2-4 weeks)

1. **MVP Detail Pages** 🎯
   - Individual MVP showcase pages
   - Download functionality with quota checking
   - Review and rating system
   - Preview images gallery
   - Demo links and GitHub integration

#### Medium Priority (1-2 months)

2. **Enhanced Seller Analytics** 👨‍💻
   - Advanced analytics and performance tracking for sellers
   - Revenue forecasting and earnings projections
   - Customer feedback aggregation and insights

3. **Admin Panel Enhancements** 🛡️
   - Advanced user management with bulk operations
   - Platform analytics with real-time dashboards
   - Content moderation tools and automated quality checks

4. **Enhanced User Features** ⭐
   - Advanced search with AI-powered recommendations
   - Wishlist and favorites
   - Email notifications
   - Community features like user profiles and MVP collections

#### Low Priority (Future releases)

5. **Advanced Integrations** 🔗
   - AI code analysis and recommendations
   - GitHub integration for automatic updates
   - Slack/Discord community features
   - API for third-party integrations

6. **Platform Optimization** 🚀
   - Performance optimization
   - SEO improvements
   - Analytics and tracking
   - A/B testing framework

## 🗄️ Database Schema Overview

The platform uses a comprehensive PostgreSQL schema with the following key tables:

- **profiles**: User profiles extending Supabase auth
- **subscriptions**: User subscription plans and billing
- **mvps**: MVP listings with metadata and files
- **downloads**: Download tracking for quota management
- **reviews**: User reviews and ratings
- **notifications**: System notifications
- **payouts**: Seller commission tracking
- **refund_requests**: Subscription refund handling
- **disputes**: Buyer-seller dispute resolution
- **audit_logs**: System audit trail

All tables have Row Level Security (RLS) enabled with comprehensive policies for data protection.

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
   Create a `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Database Setup**
   - Run the migration files in `supabase/migrations/` in order
   - This will create all tables, RLS policies, and functions

4. **Start Development**
   ```bash
   npm run dev
   ```

### Important Notes for Developers

#### Authentication Fix (PGRST116 Error)
- **Issue**: Existing users from before profile creation might not have profile records
- **Solution**: The `getCurrentUser()` method now automatically creates missing profiles
- **Status**: ✅ FIXED - Implemented automatic profile creation for existing users

#### RLS Policies
- All database operations go through Row Level Security
- Admin functions use `SECURITY DEFINER` to prevent recursion
- Test with different user roles to ensure proper access control

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
    *   Implemented simulated download functionality with quota checking via `APIService.downloadMVP`
    *   Built review and rating submission system (`SubmitReviewForm.tsx`, `APIService.submitReview`)
    *   Enhanced `MVPReviews.tsx` to accept review data as props for dynamic updates
*   **Seller Registration & Upload System**:
    *   Created `SellerSignupPage.tsx` with multi-step form for seller application
    *   Implemented comprehensive MVP upload system (`UploadMVPPage.tsx`, `MVPUploadService`)
    *   Built `MyMVPsPage.tsx` for seller portfolio management with status filtering
    *   Added demo MVP "AI-Powered SaaS Starter Kit" for platform showcase
*   **Admin Dashboard Implementation**:
    *   Created `AdminDashboardPage.tsx` with role-based access control
    *   Implemented tabbed interface with Overview, MVP Reviews, User Management, and Analytics
    *   Added MVP approval queue with approve/reject functionality
    *   Fixed routing issues for `/admin` route to prevent 404 errors
*   **Beta Account & System Enhancements**:
    *   Implemented special `beta/beta` user with full buyer/seller/admin access
    *   Added prominent "Beta Access" button to `AuthPage.tsx`
    *   Fixed login navigation using `useNavigate` to prevent 404 issues
    *   Resolved build errors (CSS import order, component exports, Browserslist update)
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
- User input validation on both client and server
- Secure file upload with validation
- Stripe webhooks for secure payment processing
- Admin functions isolated with proper permissions

## 📈 Business Model

- **Subscription-based**: Monthly plans for buyers
- **Commission-based**: Revenue sharing with sellers
- **Freemium**: Limited free tier to attract users
- **Enterprise**: Custom solutions for large organizations

## 🤝 Contributing

This is a production-ready platform. When contributing:
1. Follow the established code patterns
2. Test authentication flows thoroughly
3. Ensure RLS policies are working correctly
4. Maintain the glass morphism design consistency
5. Update this README with any significant changes

## 📞 Support

For development questions or issues:
- Check the browser console for detailed error messages
- Verify Supabase connection and RLS policies
- Test with different user roles and permissions
- Refer to the database schema for data relationships

---

**Current Status**: MVP Detail Pages, Seller Upload System, Admin Dashboard, and Stripe Integration complete. Ready for File Upload & Storage implementation.
**Next Priority**: Implement full file upload system with Supabase Storage and IPFS integration.
**Last Updated**: December 2024 - Fixed PGRST116 authentication error
