// src/App.tsx
import React, { createContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { MVPListingPage } from './pages/MVPListingPage';
import { PricingPage } from './pages/PricingPage';
import { AuthPage } from './pages/AuthPage';
import { SellerSignupPage } from './pages/SellerSignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SuccessPage } from './pages/SuccessPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MVPDetailPage } from './pages/MVPDetailPage.tsx';
import { UploadMVPPage } from './pages/UploadMVPPage';
import { MyMVPsPage } from './pages/MyMVPsPage';
import { ConnectStripePage } from './pages/ConnectStripePage';
import { PayoutsPage } from './pages/PayoutsPage';
import { GitHubAppCallbackPage } from './pages/GitHubAppCallbackPage'; // Import the new page
import { SellerProfilePage } from './pages/SellerProfilePage'; // Import the Seller Profile page
import { BuyerGitHubCallbackPage } from './pages/BuyerGitHubCallbackPage'; // Import the GitHub callback page
import { BuyerNetlifyCallbackPage } from './pages/BuyerNetlifyCallbackPage'; // Import the Netlify callback page
import { EditMVPPage } from './pages/EditMVPPage'; // Import the new EditMVPPage
import { UserSettingsPage } from './pages/UserSettingsPage'; // Import UserSettingsPage
import { RefundRequestPage } from './pages/RefundRequestPage'; // Import RefundRequestPage
import { DisputePage } from './pages/DisputePage'; // Import DisputePage
import { LeadCaptureModal } from './components/marketing/LeadCaptureModal'; // Import LeadCaptureModal
import { DisputeDetailPage } from './pages/DisputeDetailPage'; // Import DisputeDetailPage
import { AuthContext, useAuthProvider } from './hooks/useAuth';
import { MarketingService } from './lib/api'; // Import MarketingService

const AppContent: React.FC = () => {
  // State for managing the lead capture modal
  const [showLeadModal, setShowLeadModal] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if we've shown the modal before
    const hasSeenModal = localStorage.getItem('hasSeenLeadModal') === 'true';
    
    if (!hasSeenModal) {
      // Set a timer to show the modal after 15 seconds
      const timer = setTimeout(() => {
        setShowLeadModal(true);
      }, 15000);
      
      // Set up scroll listener to show modal after scrolling 50% of the page
      const handleScroll = () => {
        const scrollPosition = window.scrollY;
        const pageHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercentage = (scrollPosition / pageHeight) * 100;
        
        if (scrollPercentage > 50) {
          setShowLeadModal(true);
          window.removeEventListener('scroll', handleScroll);
          clearTimeout(timer);
        }
      };
      
      window.addEventListener('scroll', handleScroll);
      
      // Cleanup
      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);
  
  const handleCloseModal = () => {
    setShowLeadModal(false);
    // Remember that we've shown the modal
    localStorage.setItem('hasSeenLeadModal', 'true');
  };
  
  const handleSubmitLead = async (email: string, agreedToTerms: boolean) => {
    try {
      const result = await MarketingService.processLeadCapture(email, agreedToTerms);
      
      // Track conversion
      if (result.success) {
        // In a real app, you would track this conversion
        console.log('Lead captured successfully:', email);
      }
      
      return result;
    } catch (error) {
      console.error('Error submitting lead:', error);
      return { 
        success: false, 
        message: 'An unexpected error occurred. Please try again later.'
      };
    }
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/mvps" element={<MVPListingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/signin" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage />} />
          <Route path="/seller-signup" element={<SellerSignupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/success" element={<SuccessPage />} />
          {/* MVP Management Routes */}
          <Route path="/upload" element={<UploadMVPPage />} />
          <Route path="/my-mvps" element={<MyMVPsPage />} />
          <Route path="/mvp/:mvpId" element={<MVPDetailPage />} />
          <Route path="/mvp/:mvpId/edit" element={<EditMVPPage />} /> {/* New route for EditMVPPage */}
          <Route path="/settings" element={<UserSettingsPage />} />
          <Route path="/refund-request" element={<RefundRequestPage />} />
          <Route path="/dispute/:mvpId?" element={<DisputePage />} />
          <Route path="/disputes/:disputeId" element={<DisputeDetailPage />} />
          
          {/* GitHub App Callback Route */}
          <Route path="/github-app-callback" element={<GitHubAppCallbackPage />} />
          
          {/* Buyer Deploy Callback Routes */}
          <Route path="/buyer-github-callback" element={<BuyerGitHubCallbackPage />} />
          <Route path="/buyer-netlify-callback" element={<BuyerNetlifyCallbackPage />} />
          {/* Other placeholder routes */}
          <Route path="/support" element={<PlaceholderPage pageName="Support" />} />
          <Route path="/payouts" element={<PayoutsPage />} />
          <Route path="/analytics" element={<PlaceholderPage pageName="Analytics" />} />
          <Route path="/payout-settings" element={<PlaceholderPage pageName="Payout Settings" />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/connect-stripe" element={<ConnectStripePage />} />
          <Route path="/how-it-works" element={<PlaceholderPage pageName="How It Works" />} />
          <Route path="/stories" element={<PlaceholderPage pageName="Success Stories" />} />
          <Route path="/seller/:username" element={<SellerProfilePage />} />
          <Route path="/sell" element={<SellerSignupPage />} />
          <Route path="/guidelines" element={<PlaceholderPage pageName="Seller Guidelines" />} />
          <Route path="/help" element={<PlaceholderPage pageName="Help Center" />} />
          <Route path="/contact" element={<PlaceholderPage pageName="Contact Us" />} />
          <Route path="/docs" element={<PlaceholderPage pageName="API Documentation" />} />
          <Route path="/status" element={<PlaceholderPage pageName="System Status" />} />
          <Route path="/privacy" element={<PlaceholderPage pageName="Privacy Policy" />} />
          <Route path="/terms" element={<PlaceholderPage pageName="Terms of Service" />} />
          <Route path="/cookies" element={<PlaceholderPage pageName="Cookie Policy" />} />
          <Route path="/licenses" element={<PlaceholderPage pageName="License Terms" />} />
          {/* Catch-all route for 404 */}
          <Route path="*" element={<PlaceholderPage pageName="Page Not Found" />} />
        </Routes>
      </main>
      
      {/* Lead Capture Modal */}
      <LeadCaptureModal
        isOpen={showLeadModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmitLead}
      />
      
      <Footer />
    </div>
  );
};

function App() {
  const authValue = useAuthProvider();

  return (
    <AuthContext.Provider value={authValue}>
      <Router>
        <AppContent />
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
