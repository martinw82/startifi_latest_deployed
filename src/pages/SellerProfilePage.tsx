import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Star,
  Package,
  Calendar,
  Globe,
  Twitter,
  Linkedin,
  Github,
  MapPin,
  Clock,
  Download,
  CheckCircle,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { MVPCard } from '../components/mvp/MVPCard';
import { supabase } from '../lib/supabase';
import type { User as UserType, MVP } from '../types';

export const SellerProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [seller, setSeller] = useState<Partial<UserType> | null>(null);
  const [mvps, setMvps] = useState<MVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalDownloads: 0,
    averageRating: 0,
    mvpCount: 0,
    memberSince: '',
  });

  useEffect(() => {
    if (username) {
      loadSellerData(username);
    }
  }, [username]);

  const loadSellerData = async (username: string) => {
    try {
      setLoading(true);
      setError(null);

      // First, get the seller's profile
      const { data: sellerData, error: sellerError } = await supabase
        .from('profiles')
        .select(`
          id, 
          username, 
          display_name, 
          email,
          bio, 
          profile_picture_url, 
          website_url, 
          social_links,
          github_username,
          created_at
        `)
        .eq('username', username)
        .eq('is_seller_approved', true) // Only approved sellers are visible
        .single();

      if (sellerError) {
        if (sellerError.code === 'PGRST116') { // No rows returned
          setError('Seller not found or not approved');
        } else {
          console.error('Error fetching seller profile:', sellerError);
          setError('Error fetching seller profile');
        }
        setLoading(false);
        return;
      }

      if (!sellerData) {
        setError('Seller not found');
        setLoading(false);
        return;
      }

      // Set the seller data
      setSeller(sellerData);

      // Next, get all approved MVPs from this seller
      const { data: mvpsData, error: mvpsError } = await supabase
        .from('mvps')
        .select('*')
        .eq('seller_id', sellerData.id)
        .eq('status', 'approved');

      if (mvpsError) {
        console.error('Error fetching seller MVPs:', mvpsError);
        setError('Error fetching seller MVPs');
        setLoading(false);
        return;
      }

      // Process the MVPs and calculate stats
      setMvps(mvpsData || []);
      
      // Calculate statistics
      const totalDownloads = mvpsData?.reduce((sum, mvp) => sum + mvp.download_count, 0) || 0;
      const totalRatings = mvpsData?.reduce((sum, mvp) => sum + mvp.average_rating, 0) || 0;
      const averageRating = mvpsData?.length ? (totalRatings / mvpsData.length) : 0;
      
      setStats({
        totalDownloads,
        averageRating,
        mvpCount: mvpsData?.length || 0,
        memberSince: new Date(sellerData.created_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
        }),
      });

    } catch (error) {
      console.error('Error loading seller data:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-green"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The seller you're looking for might not exist or isn't approved yet.
          </p>
          <Link to="/mvps">
            <GlossyButton>
              Browse MVPs
            </GlossyButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  if (!seller) {
    return null;
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <GlassCard className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Profile Picture */}
              <div className="relative">
                {seller.profile_picture_url ? (
                  <img
                    src={seller.profile_picture_url}
                    alt={seller.display_name || seller.username || 'Seller'}
                    className="w-32 h-32 rounded-full object-cover border-2 border-neon-green shadow-neon-green-glow"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-midnight-700 flex items-center justify-center border-2 border-neon-green shadow-neon-green-glow">
                    <User className="w-16 h-16 text-neon-green" />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-neon-green rounded-full p-1 shadow-neon-green-glow-sm">
                  <CheckCircle className="w-5 h-5 text-midnight-900" />
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-neon-green mb-2">
                  {seller.display_name || seller.username}
                </h1>
                
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  @{seller.username}
                </p>
                
                {seller.bio && (
                  <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-3xl">
                    {seller.bio}
                  </p>
                )}

                {/* Stats Section */}
                <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-6">
                  <div className="flex items-center">
                    <Package className="w-5 h-5 text-neon-cyan mr-2" />
                    <span className="text-gray-700 dark:text-gray-300">
                      <strong className="text-white">{stats.mvpCount}</strong> MVPs
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Download className="w-5 h-5 text-neon-cyan mr-2" />
                    <span className="text-gray-700 dark:text-gray-300">
                      <strong className="text-white">{stats.totalDownloads}</strong> Downloads
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-neon-cyan mr-2" />
                    <span className="text-gray-700 dark:text-gray-300">
                      <strong className="text-white">{stats.averageRating.toFixed(1)}</strong> Rating
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-neon-cyan mr-2" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Member since <strong className="text-white">{stats.memberSince}</strong>
                    </span>
                  </div>
                </div>

                {/* Links Section */}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  {seller.website_url && (
                    <a
                      href={seller.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-3 py-1.5 bg-midnight-800/50 hover:bg-midnight-700/70 transition-colors border border-neon-cyan/20 rounded-full text-sm text-gray-300 hover:text-neon-cyan shadow-neon-green-glow-sm"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Website</span>
                    </a>
                  )}
                  
                  {seller.github_username && (
                    <a
                      href={`https://github.com/${seller.github_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-3 py-1.5 bg-midnight-800/50 hover:bg-midnight-700/70 transition-colors border border-neon-cyan/20 rounded-full text-sm text-gray-300 hover:text-neon-cyan shadow-neon-green-glow-sm"
                    >
                      <Github className="w-4 h-4" />
                      <span>{seller.github_username}</span>
                    </a>
                  )}
                  
                  {seller.social_links?.twitter && (
                    <a
                      href={seller.social_links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-3 py-1.5 bg-midnight-800/50 hover:bg-midnight-700/70 transition-colors border border-neon-cyan/20 rounded-full text-sm text-gray-300 hover:text-neon-cyan shadow-neon-green-glow-sm"
                    >
                      <Twitter className="w-4 h-4" />
                      <span>Twitter</span>
                    </a>
                  )}
                  
                  {seller.social_links?.linkedin && (
                    <a
                      href={seller.social_links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-3 py-1.5 bg-midnight-800/50 hover:bg-midnight-700/70 transition-colors border border-neon-cyan/20 rounded-full text-sm text-gray-300 hover:text-neon-cyan shadow-neon-green-glow-sm"
                    >
                      <Linkedin className="w-4 h-4" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* MVPs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Package className="w-6 h-6 text-neon-green mr-2" />
            <span>Published MVPs</span>
          </h2>

          {mvps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mvps.map((mvp) => (
                <MVPCard
                  key={mvp.id}
                  mvp={mvp}
                  onClick={() => window.location.href = `/mvp/${mvp.id}`}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="p-8 text-center">
              <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No Published MVPs Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {seller.display_name || seller.username} hasn't published any MVPs yet.
              </p>
              <Link to="/mvps">
                <GlossyButton>
                  Browse Other MVPs
                </GlossyButton>
              </Link>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </div>
  );
};