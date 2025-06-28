import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { MVPGrid } from '../components/mvp/MVPGrid';
import { MVPFilters } from '../components/mvp/MVPFilters';
import { APIService } from '../lib/api';
import type { MVP } from '../types';

export const MVPListingPage: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [mvps, setMvps] = useState<MVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTechStack, setSelectedTechStack] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('published_at');
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    loadMVPs();
  }, [searchQuery, selectedCategory, selectedTechStack, sortBy, currentPage]);

  const loadMVPs = async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchQuery || undefined,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        techStack: selectedTechStack.length > 0 ? selectedTechStack : undefined,
        sortBy: sortBy as any,
        page: currentPage,
        limit: 20,
      };

      const { mvps: loadedMVPs, total } = await APIService.getMVPs(filters);
      setMvps(loadedMVPs);
      setTotalCount(total);
    } catch (error) {
      console.error('Error loading MVPs:', error);
      // In a real app, show error notification
    } finally {
      setLoading(false);
    }
  };

  const handleMVPClick = (mvp: MVP) => {
    // Navigate to MVP detail page using useNavigate
    navigate(`/mvp/${mvp.id}`);
  };

  const handleFilterChange = () => {
    setCurrentPage(0); // Reset to first page when filters change
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Browse MVPs
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover production-ready MVP templates built by expert developers and optimized for AI integration.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="sticky top-24">
              <MVPFilters
                searchQuery={searchQuery}
                onSearchChange={(query) => {
                  setSearchQuery(query);
                  handleFilterChange();
                }}
                selectedCategory={selectedCategory}
                onCategoryChange={(category) => {
                  setSelectedCategory(category);
                  handleFilterChange();
                }}
                selectedTechStack={selectedTechStack}
                onTechStackChange={(techStack) => {
                  setSelectedTechStack(techStack);
                  handleFilterChange();
                }}
                sortBy={sortBy}
                onSortChange={(sort) => {
                  setSortBy(sort);
                  handleFilterChange();
                }}
              />
            </div>
          </motion.div>

          {/* MVP Grid */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {loading ? (
                  'Loading...'
                ) : (
                  `Showing ${mvps.length} of ${totalCount} MVPs`
                )}
              </div>
            </div>

            {/* MVP Grid */}
            <MVPGrid
              mvps={mvps}
              loading={loading}
              onMVPClick={handleMVPClick}
            />

            {/* Pagination */}
            {!loading && totalCount > 20 && (
              <div className="mt-12 flex justify-center">
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.ceil(totalCount / 20) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentPage === index
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
