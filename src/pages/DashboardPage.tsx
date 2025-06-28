import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { BuyerDashboardPage } from './BuyerDashboardPage';
import { SellerDashboardPage } from './SellerDashboardPage';

export const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please sign in to access your dashboard
          </h1>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  if (user.role === 'seller' || user.role === 'both') {
    return <SellerDashboardPage />;
  }

  return <BuyerDashboardPage />;
};