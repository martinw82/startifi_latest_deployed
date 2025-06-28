import { useState, useEffect, createContext, useContext } from 'react';
import { AuthService } from '../lib/auth';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role?: 'buyer' | 'seller') => Promise<void>;
  signOut: () => Promise<void>;
  refetch: () => Promise<User | null>; // Add refetch function
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch current user with error handling for invalid refresh tokens
  const refetchUser = async (): Promise<User | null> => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error: any) {
      console.error('Error fetching current user:', error);
      
      // Check if it's an AuthApiError with refresh_token_not_found code
      if (error?.__isAuthError && error?.code === 'refresh_token_not_found') {
        console.warn('Invalid refresh token detected, signing out');
        // Clear the invalid session
        await AuthService.signOut();
        setUser(null);
      }
      
      return null;
    }
  };

  useEffect(() => {
    // Get initial auth state
    const initializeAuth = async () => {
      setLoading(true);
      await refetchUser();
      setLoading(false);
    };
    
    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { user: authUser } = await AuthService.signIn(email, password);
    if (authUser) {
      await refetchUser(); // Use refetchUser to properly handle any errors
    }
  };

  const signUp = async (email: string, password: string, role: 'buyer' | 'seller' = 'buyer') => {
    await AuthService.signUp(email, password, role);
    // Note: User will need to verify email before they can sign in
  };

  const signOut = async () => {
    await AuthService.signOut();
    setUser(null);
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refetch: refetchUser, // Expose the refetch function
  };
};

export { AuthContext };