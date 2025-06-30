import React from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlossyButton } from '../ui/GlossyButton';

interface MVPFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedTechStack: string[];
  onTechStackChange: (techStack: string[]) => void;
  minPrice?: string | number;
  onMinPriceChange: (minPrice: string) => void;
  maxPrice?: string | number;
  onMaxPriceChange: (maxPrice: string) => void;
  selectedLicensingTerms: string;
  onLicensingTermsChange: (terms: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

const categories = [
  'All',
  'SaaS',
  'E-commerce',
  'Portfolio',
  'Utility',
  'Dashboard',
  'Landing Page',
  'Mobile App',
];

const techStackOptions = [
  'React',
  'Next.js',
  'Vue.js',
  'Angular',
  'Node.js',
  'Python',
  'TypeScript',
  'JavaScript',
  'Tailwind CSS',
  'Bootstrap',
  'Supabase',
  'Firebase',
  'MongoDB',
  'PostgreSQL',
  'Stripe',
  'Auth0',
];

const sortOptions = [
  { value: 'published_at', label: 'Latest' },
  { value: 'download_count', label: 'Most Downloaded' },
  { value: 'average_rating', label: 'Highest Rated' },
];

const licensingOptions = [
  { value: 'all', label: 'All Licenses' },
  { value: 'standard_commercial', label: 'Standard Commercial' },
  { value: 'premium_commercial', label: 'Premium Commercial' },
  { value: 'personal_use_only', label: 'Personal Use Only' },
];

export const MVPFilters: React.FC<MVPFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedTechStack,
  onTechStackChange,
  minPrice = '',
  onMinPriceChange,
  maxPrice = '',
  onMaxPriceChange,
  selectedLicensingTerms,
  onLicensingTermsChange,
  sortBy,
  onSortChange,
}) => {
  const toggleTechStack = (tech: string) => {
    if (selectedTechStack.includes(tech)) {
      onTechStackChange(selectedTechStack.filter(t => t !== tech));
    } else {
      onTechStackChange([...selectedTechStack, tech]);
    }
  };

  const clearAllFilters = () => {
    onSearchChange('');
    onCategoryChange('All');
    onTechStackChange([]);
    onMinPriceChange('');
    onMaxPriceChange('');
    onLicensingTermsChange('all');
    onSortChange('published_at');
  };

  const hasActiveFilters = searchQuery || 
                          selectedCategory !== 'All' || 
                          selectedTechStack.length > 0 || 
                          minPrice !== '' || 
                          maxPrice !== '' || 
                          selectedLicensingTerms !== 'all';

  return (
    <GlassCard className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Filters
          </h3>
        </div>
        {hasActiveFilters && (
          <GlossyButton
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Clear All</span>
          </GlossyButton>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search MVPs..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
        />
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sort by
        </label>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Price Range
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="number"
              placeholder="Min Price"
              min="0"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Max Price"
              min="0"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Licensing Terms */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Licensing Terms
        </label>
        <select
          value={selectedLicensingTerms}
          onChange={(e) => onLicensingTermsChange(e.target.value)}
          className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
        >
          {licensingOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Category
        </label>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <motion.button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-white/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {category}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Tech Stack
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {techStackOptions.map((tech) => (
            <motion.label
              key={tech}
              className="flex items-center space-x-3 cursor-pointer"
              whileHover={{ x: 2 }}
            >
              <input
                type="checkbox"
                checked={selectedTechStack.includes(tech)}
                onChange={() => toggleTechStack(tech)}
                className="w-4 h-4 text-blue-600 bg-white/10 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {tech}
              </span>
            </motion.label>
          ))}
        </div>
      </div>

      {selectedTechStack.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Technologies
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedTechStack.map((tech) => (
              <motion.span
                key={tech}
                className="inline-flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded-full"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                {tech}
                <button
                  onClick={() => toggleTechStack(tech)}
                  className="ml-1 hover:bg-blue-700 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
};