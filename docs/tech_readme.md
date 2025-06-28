# Technical README: MVP Library Platform

This document provides a comprehensive technical overview of the MVP Library Platform, detailing its current state, development history, technical implementations, encountered issues and their solutions, and the future roadmap.

## 1. Project Overview

The MVP Library Platform is a marketplace for AI-ready Minimum Viable Product (MVP) codebases. It aims to accelerate development for entrepreneurs, developers, and agencies by providing high-quality, production-ready templates. The platform supports both buyers (downloading MVPs) and sellers (uploading and managing MVPs), with an administrative interface for platform management and a comprehensive payment system.

## 2. Technology Stack

The platform is built with a modern web technology stack, focusing on performance, scalability, and developer experience.

### Frontend:
- **React 18 with TypeScript**: For building dynamic and interactive user interfaces.
- **Vite**: A fast build tool for modern web projects, providing quick development server startup and hot module replacement.
- **Tailwind CSS**: A utility-first CSS framework for rapid and consistent styling, including a custom glass morphism design system.
- **Framer Motion**: For declarative animations and smooth UI transitions.
- **Lucide React**: A collection of open-source icons used throughout the application.
- **React Router DOM**: For client-side routing and navigation within the Single Page Application (SPA).

### Backend & Database:
- **Supabase**: An open-source Firebase alternative providing PostgreSQL database, authentication, and real-time features.
- **PostgreSQL**: The relational database managed by Supabase, with extensive use of Row Level Security (RLS) for data access control.
- **Stripe**: Fully integrated for payment processing, subscription management, and seller payouts via Stripe Connect.
- **Supabase Edge Functions**: Used for serverless functions, handling Stripe webhooks, Connect account creation, GitHub App integration, and IPFS pinning.

### Development Tools:
- **ESLint**: For static code analysis and maintaining code quality.
- **TypeScript**: For type safety and improved code maintainability.
- **PostCSS with Autoprefixer**: For processing CSS and adding vendor prefixes.
- **jsonwebtoken**: For generating JWTs for GitHub App authentication in Edge Functions.

## 3. Development History & Key Milestones

The project has evolved through several key phases, addressing core functionalities and refining the user experience.

### Initial Setup & Core Infrastructure:
- Project initialized with Vite, React, and TypeScript.
- Tailwind CSS configured with a custom glass morphism design.
- Basic component architecture established.
- Supabase integration for authentication and database.

### Authentication & Profile Management:
- Implemented user authentication (sign-up, sign-in, sign-out) using Supabase Auth.
- Developed a profile management system with roles (buyer, seller, admin, both).
- **PGRST116 Error Fix**: Addressed an issue where users without existing profiles would cause a PGRST116 error during getCurrentUser() calls. The AuthService.getCurrentUser() method was enhanced to automatically create a default profile for such users upon their first login.

### SPA Navigation Overhaul:
- **Issue**: Initial navigation used window.location.href for internal links, causing full page reloads and a suboptimal SPA experience.
- **Solution**: Refactored `Header.tsx`, `Footer.tsx`, `BuyerDashboardPage.tsx`, and `SellerDashboardPage.tsx` to exclusively use `Link` components and the `useNavigate` hook from `react-router-dom` for internal navigation. This ensures smooth client-side transitions.

### Placeholder Route Implementation:
- Defined numerous placeholder routes in `src/App.tsx` for future features.
- Created a generic `PlaceholderPage.tsx` component to render for these routes, providing a clear "under construction" message.

### Link Destination Verification:
- Confirmed that all ambiguous links (e.g., `/support`, `/contact`) should be treated as internal SPA routes, validating the existing placeholder setup.

### Auth & Data Fetching Code Review:
- A comprehensive review of `auth.ts`, `useAuth.ts`, `api.ts`, and dashboard data fetching logic was conducted.
- **Strengths**: Resilient authentication core, clear auth state management, centralized API service, typed Supabase interactions.
- **Areas for Improvement**: Usage of mock data in `SellerDashboardPage.tsx` and `APIService.ts`, limited user-facing error feedback, potential state synchronization issues for dynamic user data, need for thorough RLS testing, and a more robust logging strategy.

### MVP Detail Pages:
- **Phase 1 (Foundation)**:
  - Scaffolded `MVPDetailPage.tsx` and added its route (`/mvp/:mvpId`) to `App.tsx`.
  - Implemented data fetching and display for core MVP details (title, description, features, tech stack, seller info).
  - Created and integrated `MVPImageGallery.tsx` for displaying preview images.
  - Added display for "Live Demo" and "GitHub Repository" links.
  - Included a placeholder "Download MVP" button and an initial `MVPReviews.tsx` component.
- **Enhancements (Download & Review System)**:
  - Implemented a simulated download functionality on `MVPDetailPage.tsx` with quota checking via `APIService.downloadMVP`.
  - Developed a review and rating submission system using `SubmitReviewForm.tsx`, allowing authenticated users to submit star ratings and comments.
  - Refactored `MVPReviews.tsx` to accept review data as props, enabling dynamic updates.

### Seller Registration & Upload System:
- Created `SellerSignupPage.tsx`, a multi-step form for users to apply as sellers.
- Includes fields for personal info, experience, specializations, portfolio, and terms agreement.
- Integrates with `AuthService.signUp` to register users with a 'seller' role.
- Implemented comprehensive MVP upload system with file validation, progress tracking, and metadata management.

### Admin Dashboard:
- Implemented `AdminDashboardPage.tsx` with role-based access control (only 'admin' or 'both' roles).
- Features a tabbed interface for Overview, MVP Reviews, User Management (placeholder), and Analytics (placeholder).
- Overview displays key platform statistics and pending MVP reviews.
- **Issue**: Manual browsing to `/admin` sometimes resulted in a 404.
- **Solution**: Ensured proper client-side routing with `useNavigate` for redirects and added a catch-all route in `App.tsx` to prevent 404s for unmatched paths. Enhanced authentication checks and loading states for the admin section.

### Beta Account for Testing:
- Implemented a special 'beta' user (`beta/beta`) with full buyer, seller, and admin access.
- This account bypasses certain checks and uses mock data for testing purposes, preventing database pollution.
- A prominent "Beta Access" button was added to `AuthPage.tsx` for easy login.

### Build Fixes and Updates:
- **Issue**: `@import` rule for Google Fonts in `src/index.css` was placed after `@tailwind` directives, causing a CSS build error.
- **Solution**: Moved the `@import` rule to the very beginning of `src/index.css`, before any `@tailwind` directives, as required by CSS specifications.
- **Issue**: `MVPDetailPage` was exported as a default export but imported as a named export in `src/App.tsx`, leading to a build error.
- **Solution**: Changed `MVPDetailPage` to a named export (`export const MVPDetailPage`).
- **Issue**: Outdated `caniuse-lite` database used by Browserslist.
- **Solution**: Executed `npx update-browserslist-db@latest` to update the package.

### RLS Policy Fixes:
- **Issue**: Infinite recursion detected in RLS policies, particularly when checking admin status from within a policy on the profiles table.
- **Solution**: Created a `SECURITY DEFINER` SQL function `is_admin()` that safely checks the user's role without triggering RLS recursion. All admin-related RLS policies were updated to use this function.
- **Issue**: Users could not insert their own profile after signing up due to a missing RLS policy.
- **Solution**: Added a specific `INSERT` policy for the `profiles` table allowing authenticated users to insert a row where `auth.uid() = id`.

### Stripe Connect & Payouts Integration:
- **Implementation of `src/pages/ConnectStripePage.tsx`**: Complete Stripe Connect onboarding flow for sellers.
- **Implementation of `src/pages/PayoutsPage.tsx`**: Comprehensive payout management interface for sellers.
- **Enhanced `supabase/functions/stripe-webhook/index.ts`**: Comprehensive webhook handling system for subscription lifecycle, payment processing, Stripe Connect events, and payout tracking.
- **New Edge Function `supabase/functions/create-stripe-connect-account/index.ts`**: Stripe Connect account creation and onboarding.
- **Enhanced API Methods in `src/lib/api.ts`**: Comprehensive payout and Stripe Connect management.
- **Updated `src/pages/AdminDashboardPage.tsx`**: Enhanced administrative capabilities with "Pending Payouts" section.

### GitHub App Integration (In Progress):
- **Database Schema Update**: Added `github_repo_owner`, `github_repo_name`, `last_synced_github_commit_sha`, `github_webhook_secret`, and `github_app_installation_id` columns to the `mvps` table.
- **New Edge Functions**:
    - `supabase/functions/create-github-app-installation/index.ts`: Handles GitHub App callback, exchanges code for token, and stores `installation_id` in the `mvps` table.
    - `supabase/functions/get-github-app-token/index.ts`: Generates short-lived installation access tokens for GitHub API calls using JWT.
- **Modified Edge Function**:
    - `supabase/functions/github-webhook/index.ts`: Now verifies webhook signatures using per-MVP secrets and uses installation access tokens for authenticated GitHub API calls (e.g., downloading archives for updates).
- **Frontend Updates**:
    - `src/App.tsx`: Added a new route `/github-app-callback` for the GitHub App installation flow.
    - `src/lib/api.ts` (`GitHubService`): Added methods for linking/unlinking repositories, validating repositories, getting latest repository info, and completing GitHub App installations. These methods now handle token generation and authenticated API calls.
    - `src/lib/mvpUpload.ts`: Added `updateMVPFromGitHub` and `syncFromGitHub` functions to handle automated and manual MVP updates from GitHub repositories, including downloading archives and updating MVP records.
    - `src/components/mvp/GitHubLinkModal.tsx`: New component for managing GitHub repository linking, including input for owner/repo, webhook secret generation, and initiating the GitHub App installation flow.
    - `src/pages/GitHubAppCallbackPage.tsx`: New page to handle the redirect from GitHub after app installation, processing the `code` and `installation_id` to complete the linking.
    - `src/pages/MyMVPsPage.tsx`: Integrated the `GitHubLinkModal` and added UI elements for linking and syncing MVPs with GitHub.
-- **Database Schema Update**: Added `github_repo_owner`, `github_repo_name`, `last_synced_github_commit_sha`, `github_webhook_secret`, and `github_app_installation_id` columns to the `mvps` table.
+- **Database Schema Update**: The `mvps` table now includes `github_repo_owner`, `github_repo_name`, `last_synced_github_commit_sha`, `github_webhook_secret`, and `github_app_installation_id` columns.
 - **New Edge Functions**:
     - `supabase/functions/create-github-app-installation/index.ts`: Handles GitHub App callback, exchanges code for token, and stores `installation_id` in the `mvps` table.
     - `supabase/functions/get-github-app-token/index.ts`: Generates short-lived installation access tokens for GitHub API calls using JWT.
@@ -115,6 +115,7 @@
     - `src/pages/GitHubAppCallbackPage.tsx`: New page to handle the redirect from GitHub after app installation, processing the `code` and `installation_id` to complete the linking.
     - `src/lib/mvpUpload.ts`: Added `updateMVPFromGitHub` and `syncFromGitHub` functions to handle automated and manual MVP updates from GitHub repositories, including downloading archives and updating MVP records.
     - `src/components/mvp/GitHubLinkModal.tsx`: New component for managing GitHub repository linking, including input for owner/repo, webhook secret generation, and initiating the GitHub App installation flow.
-    - `src/pages/MyMVPsPage.tsx`: Integrated the `GitHubLinkModal` and added UI elements for linking and syncing MVPs with GitHub.
+    - `src/pages/MyMVPsPage.tsx`: Integrated the `GitHubLinkModal` and added UI elements for linking and syncing MVPs with GitHub.
+    - `src/lib/api.ts`
 
+    
## 4. Deployment Details

The application is designed for modern web deployment.

- **Development**: Uses Vite's development server (`npm run dev`).
- **Hosting**: Intended for deployment on platforms like Netlify for static site hosting.
- **Backend**: Supabase provides the PostgreSQL database, authentication services, and serverless Edge Functions.
- **Payment Processing**: Stripe handles all payment processing, subscription management, and seller payouts via Stripe Connect.

## 5. Dependencies

### Current Dependencies (package.json)

#### Runtime Dependencies:
- **@stripe/stripe-js**: Stripe's official JavaScript library for frontend integration.
- **@supabase/supabase-js**: Supabase JavaScript client library.
- **clsx**: A tiny utility for constructing className strings conditionally.
- **date-fns**: A modern JavaScript date utility library.
- **framer-motion**: For animations and gestures.
- **lucide-react**: React components for Lucide icons.
- **react**: React core library.
- **react-dom**: React DOM for browser rendering.
- **react-markdown**: A Markdown component for React.
- **react-router-dom**: DOM bindings for React Router.

#### Development Dependencies:
- **@eslint/js**: ESLint's core JavaScript rules.
- **@types/react, @types/react-dom**: TypeScript type definitions for React.
- **@vitejs/plugin-react**: Vite plugin for React projects.
- **autoprefixer**: PostCSS plugin to parse CSS and add vendor prefixes.
- **eslint**: Pluggable JavaScript linter.
- **eslint-plugin-react-hooks**: ESLint rules for React Hooks.
- **eslint-plugin-react-refresh**: ESLint plugin for React Fast Refresh.
- **globals**: Global variables for ESLint.
- **postcss**: Tool for transforming CSS with JavaScript plugins.
- **tailwindcss**: A utility-first CSS framework.
- **typescript**: TypeScript language.
- **typescript-eslint**: ESLint parser and plugins for TypeScript.
- **vite**: Next generation frontend tooling.

### Required Dependencies for Upgrades / Future Features:

- **jsonwebtoken**: Used in Supabase Edge Functions for GitHub App authentication.
- **IPFS Client Libraries**: For full IPFS integration (future File Upload & Storage implementation).
- **Advanced UI Components**: Potential charting libraries for analytics dashboards.
- **Logging/Monitoring**: For production environments, integration with services like Sentry or LogRocket.
- **Email Services**: For transactional emails and notifications.

## 6. Roadmap & Pending Features

The platform has a clear roadmap to become a fully functional marketplace.

### ✅ COMPLETED - High Priority
- **Stripe Integration (FULLY COMPLETED)**:
  - ✅ Subscription management with comprehensive webhook handling
  - ✅ Stripe Connect for seller payouts with automatic onboarding
  - ✅ Payment processing for both subscriptions and one-time payments
  - ✅ Automated seller approval based on Stripe Connect status
  - ✅ Monthly payout processing with commission calculations
  - ✅ Admin payout management and processing tools
   - ✅ Payout management for seller commission processing

- **MVP Detail Pages & User Interaction (FULLY COMPLETED)**:
  - ✅ Comprehensive MVP showcase pages with dynamic routing
  - ✅ Interactive image galleries with thumbnails and main image display
  - ✅ Simulated download functionality with quota checking and user feedback
  - ✅ Complete review and rating system with star ratings and comments
  - ✅ Real-time review updates and verified buyer badges
  - ✅ Authentication-aware features with proper access control

- **Seller Onboarding & MVP Management (FULLY COMPLETED)**:
  - ✅ Multi-step seller registration with experience and portfolio validation
  - ✅ Comprehensive MVP upload system with file validation and progress tracking
  - ✅ Image gallery upload with preview and management capabilities
  - ✅ Seller portfolio management with status filtering and quick actions
  - ✅ Demo MVP content for platform showcase and testing

- **Admin Dashboard & Platform Management (FULLY COMPLETED)**:
  - ✅ Role-based admin interface with comprehensive access control
  - ✅ MVP approval queue with approve/reject functionality
  - ✅ Platform statistics dashboard with real-time data
  - ✅ User management interface with role indicators
  - ✅ Payout management for seller commission processing

- **Beta Account & System Enhancements (FULLY COMPLETED)**:
  - ✅ Comprehensive beta testing account with full platform access
+  - ✅ Comprehensive beta testing account with full platform access (buyer, seller, admin)
   - ✅ Enhanced authentication UX with prominent beta access
   - ✅ Navigation fixes to prevent 404 errors after login
   - ✅ Build stability improvements and CSS/component fixes

- **File Upload & Storage (FULLY COMPLETED)**:
   - ✅ Full MVP file upload system with Supabase Storage integration
   - ✅  IPFS integration for decentralized storage and redundancy
   - ✅ File validation and security scanning for uploaded content
-  - ✅ Version management for MVPs with changelog tracking
-  - ✅ Storage optimization and CDN integration
+  - ✅ File validation and security scanning for uploaded content (via `scan-mvp-file` Edge Function)
+  - ✅ Version management for MVPs with changelog tracking (via `pin-to-ipfs` Edge Function)
 

### HIGH Priority (full impelmentation)
- **Advanced Integrations**:
  - GitHub integration for automatic updates and CI/CD (in progress - current implementation is public key based and insecure/inconvenient) ????  are we sure i think this is not true now
  - Third-party deployment platform integrations (Netlify, Vercel)
  - API marketplace for extended functionality
 - **Authentication**: Secure authentication flow with automatic profile creation and role management.
 - **GitHub App Security**: Utilizes short-lived installation tokens for secure API interactions with GitHub, minimizing exposure of credentials.
 
### Medium Priority (1-2 months)
- **Enhanced Seller Workflow**:
  - Advanced analytics and performance tracking for sellers
  - Automated payout scheduling and tax reporting
  - Seller verification and quality assurance programs
  
- **Admin Panel Enhancements**:
  - Advanced user management with bulk operations
  - Platform analytics with real-time dashboards
  - Content moderation tools and automated quality checks
  
- **Enhanced User Features**:
  - Advanced search with AI-powered recommendations using embeddings
  - Community features like user profiles and MVP collections
  - Enhanced review system with verified purchaser badges


  
- **Platform Optimization**:
  - Performance optimization with CDN integration
  - SEO improvements and technical optimizations
  - Advanced security features and compliance certifications

## 7. Database Schema Overview

The platform utilizes a comprehensive PostgreSQL schema managed by Supabase, with Row Level Security (RLS) enabled on all tables to ensure data protection. Key tables include:

### Core Tables:
- **profiles**: User profiles linked to auth.users, storing roles, Stripe IDs, and seller approval status.
- **subscriptions**: Manages user subscription plans and status.
- **mvps**: Stores MVP listings with metadata, file details, preview images, and status.
    - **New columns**: `github_repo_owner`, `github_repo_name`, `last_synced_github_commit_sha`, `github_webhook_secret`, `github_app_installation_id`
- **downloads**: Tracks user downloads for quota management.
- **reviews**: Stores user reviews and ratings for MVPs.
- **payouts**: Tracks seller commission payouts with detailed status tracking.

### Stripe Integration Tables:
- **stripe_customers**: Links Supabase users to Stripe customer records.
- **stripe_subscriptions**: Manages subscription data with payment method details.
- **stripe_orders**: Handles one-time payment transactions.

### Administrative Tables:
- **notifications**: System notifications for users.
- **refund_requests**: Handles subscription refund requests.
- **disputes**: Manages buyer-seller dispute resolution.
- **audit_logs**: Records system audit trails for sensitive actions.

### Security Features:
- **RLS policies** are meticulously defined for each table, ensuring that users can only access data relevant to their role and ownership.
- **SECURITY DEFINER functions** provide administrators with broader access while preventing infinite recursion.
- **Comprehensive webhook handling** ensures data consistency between Stripe and Supabase.

## 8. Security Considerations

- **Payment Security**: All payment processing handled by Stripe with PCI DSS compliance.
- **Data Protection**: Row Level Security policies ensure users only access their own data.
- **Webhook Security**: Stripe webhook signature verification prevents unauthorized requests. GitHub webhook signatures are also verified using per-MVP secrets.
- **File Upload Security**: Comprehensive validation and planned security scanning for uploaded files.
- **Authentication**: Secure authentication flow with automatic profile creation and role management.
- **GitHub App Security**: Utilizes short-lived installation tokens for secure API interactions with GitHub, minimizing exposure of credentials.

+## 9. Business Model Implementation (FULLY COMPLETED)
 
 - **Subscription-based**: Monthly plans for buyers with automatic quota management.
 - **Commission-based**: 70% to sellers, 30% platform fee with automated monthly payouts.
 - **Enterprise Ready**: Infrastructure designed to scale with business growth.
 
 This concludes the comprehensive technical overview of the MVP Library Platform.
-
+The GitHub App integration is now fully implemented from a code perspective



Update Documentation:

Modify docs/tech_readme.md: In the "GitHub App Integration" section, ensure that the description of the mvps table explicitly states that github_app_installation_id is a column within it. You can also update the "Database Schema Overview" section to reflect this.
Modify docs/usersummary_readme.md: Similarly, in the "GitHub Integration (In Progress)" section, clarify that the mvps table includes the github_app_installation_id.


added this update to schema for proper github flow -->  THESE MIGRATIONS ARE DONE AND IN DATABASE

-- supabase/migrations/20250625230102_move_github_app_installation_id.sql

-- This migration moves the github_app_installation_id column from the mvps table
-- to the profiles table. This is to correctly associate GitHub App installations
-- with user profiles (sellers) rather than individual MVPs, as an installation
-- is typically per user/organization.

-- Affected Tables:
--   - profiles: Adds github_app_installation_id column.
--   - mvps: Drops github_app_installation_id column.

-- Step 1: Add github_app_installation_id to the profiles table
-- This column will store the ID of the GitHub App installation associated with a user (seller).
-- It is nullable because not all users will have a GitHub App installed.
ALTER TABLE profiles
ADD COLUMN github_app_installation_id BIGINT;

-- Step 2: Remove github_app_installation_id from the mvps table
-- This column is no longer needed in the mvps table as the installation ID
-- will now be stored in the profiles table.
ALTER TABLE mvps
DROP COLUMN github_app_installation_id;

-- Note: Existing RLS policies on the 'profiles' table (e.g., "Users can view own profile",
-- "Users can update own profile", "Admins can view all profiles") will automatically
-- apply to the new 'github_app_installation_id' column. No new RLS policies are
-- explicitly needed for this column unless specific access rules are required
-- beyond the existing profile access.


-- supabase/migrations/YYYYMMDDHHMMSS_add_processing_error_to_mvps.sql

-- Add last_processing_error column to the mvps table
ALTER TABLE mvps
ADD COLUMN last_processing_error TEXT;

-- Optional: Add an index if you plan to query this column frequently
-- CREATE INDEX IF NOT EXISTS idx_mvps_last_processing_error ON mvps(last_processing_error);




Comprehensive Update Summary: MVP Library Platform Enhancements
This document outlines the significant progress made on the MVP Library Platform, detailing new features, improved functionalities, and critical bug fixes implemented throughout our recent development sessions.

1. Core Platform & UI/UX Improvements
SPA Navigation Overhaul: The application's navigation has been refactored to provide a true Single Page Application (SPA) experience. All internal links now utilize react-router-dom's Link components and useNavigate hook, eliminating full page reloads and ensuring smooth client-side transitions. This addressed initial issues where window.location.href was causing suboptimal user experience.
Placeholder Route Implementation: A robust routing setup has been established, including the definition of numerous placeholder routes in src/App.tsx and the creation of a generic PlaceholderPage.tsx. This ensures all anticipated navigation links are functional and provide clear "under construction" messages.
Build Fixes and Stability: Critical build errors have been resolved, including:
Correcting CSS import order in src/index.css to prevent compilation issues.
Fixing component export mismatches (e.g., MVPDetailPage) to ensure proper module loading.
Updating the caniuse-lite database for improved browser compatibility.
Beta Account System: A dedicated "beta" account (beta/beta) has been implemented for comprehensive testing. This account grants full buyer, seller, and admin access with pre-approval and unlimited quotas, facilitating thorough testing of all platform features. A prominent "Beta Access" button has been added to the authentication page for easy access.
2. MVP Management & User Interaction
MVP Detail Pages (Full Implementation):
Foundation: Comprehensive individual showcase pages (MVPDetailPage.tsx) have been created with dynamic routing, displaying all MVP details (title, description, features, tech stack, seller info).
Image Gallery: An interactive image gallery (MVPImageGallery.tsx) has been integrated to showcase MVP preview images with thumbnails.
Download System: A simulated quota-based download functionality has been implemented, allowing authenticated users to "download" MVPs while respecting mock download limits. (Note: The transition to real download logic is a pending task).
Review & Rating System: A complete review and rating system has been added, enabling users to submit star ratings and comments (SubmitReviewForm.tsx) and view existing reviews (MVPReviews.tsx).
Seller Registration & Upload System:
Seller Signup Page: A multi-step application process (SellerSignupPage.tsx) has been developed for new sellers, covering account setup, experience details, and portfolio information.
MVP Upload Page: A comprehensive MVP upload system (UploadMVPPage.tsx) is in place, featuring forms for metadata, file uploads (ZIP, TAR.GZ, RAR), and image gallery management.
Seller Portfolio Management: The "My MVPs" page (MyMVPsPage.tsx) allows sellers to manage their uploaded MVPs, including status filtering (Approved, Pending, Rejected) and quick actions (View, Edit, Delete).
Demo MVP: A production-quality demo MVP ("AI-Powered SaaS Starter Kit") has been added to showcase platform capabilities.
Admin Dashboard (Initial Implementation): An initial version of the admin dashboard (AdminDashboardPage.tsx) has been implemented, providing role-based access, key platform statistics, and an MVP review queue for approval/rejection. Routing issues for direct access to /admin have been resolved.
Retry Processing for MVPs: For MVPs that fail security scanning (scan_failed) or IPFS pinning (ipfs_pin_failed), a "Retry Processing" button has been added to the MyMVPsPage.tsx. This allows sellers to re-queue the processing of their MVP files. The UI now also displays the last_processing_error message for failed MVPs, providing more context.
3. Integrations
Stripe Integration (Manual Configuration): The platform features a manually configured Stripe setup for payment processing, subscription management, and seller payouts via Stripe Connect. This includes handling subscription lifecycle events, seller onboarding, and payout management. (Note: This manual setup cannot be migrated to Bolt's managed integration).
GitHub App Integration (Code Complete): A robust and secure GitHub App integration has been largely implemented to enable automatic MVP updates from private repositories. Key components include:
Database Schema Updates: The github_app_installation_id column has been moved from the mvps table to the profiles table to correctly associate GitHub App installations with user profiles (sellers). A last_processing_error column has also been added to the mvps table for detailed error logging.
Edge Functions: New Edge Functions (create-github-app-installation, get-github-app-token, initiate-github-oauth) handle GitHub App authentication, token generation, and OAuth flow. The existing github-webhook Edge Function has been modified to verify webhook signatures and use installation access tokens for authenticated GitHub API calls.
Frontend UI: The GitHubLinkModal.tsx and GitHubAppCallbackPage.tsx components facilitate the GitHub App installation and repository linking process. The APIService.GitHubService methods now handle authenticated GitHub API interactions. The MyMVPsPage.tsx includes UI elements for linking and syncing MVPs with GitHub repositories.
4. Backend & Database Enhancements
RLS Policy Fixes: Row Level Security (RLS) policies have been refined to prevent infinite recursion issues, particularly when checking admin status. A secure is_admin() SQL function has been introduced to safely bypass RLS for administrative checks.
Database Schema Updates: As mentioned above, the github_app_installation_id column has been relocated to the profiles table, and last_processing_error has been added to the mvps table.
