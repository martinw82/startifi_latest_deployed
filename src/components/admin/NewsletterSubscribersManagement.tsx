import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Download,
  Filter,
  DownloadCloud,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlossyButton } from '../ui/GlossyButton';
import { NewsletterService } from '../../lib/newsletterService';
import type { NewsletterSubscriber } from '../../types';

export const NewsletterSubscribersManagement: React.FC = () => {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'unsubscribed'>('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await NewsletterService.getAllNewsletterSubscribers();
      setSubscribers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSubscribers = async (format: 'csv' | 'json') => {
    try {
      setExporting(true);
      const exportData = await NewsletterService.exportSubscribersList(format);
      
      // Create a Blob from the data
      const blob = new Blob([exportData], {
        type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json'
      });
      
      // Create a URL for the Blob
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link element and trigger a download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `subscribers_export.${format}`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export subscribers');
    } finally {
      setExporting(false);
    }
  };

  // Filter and search subscribers
  const filteredSubscribers = subscribers
    .filter(sub => {
      // Filter by status
      if (filterStatus !== 'all') {
        return filterStatus === 'active' 
          ? !sub.unsubscribed_at 
          : !!sub.unsubscribed_at;
      }
      return true;
    })
    .filter(sub => {
      // Search implementation
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        sub.email.toLowerCase().includes(query) ||
        (sub.source || '').toLowerCase().includes(query)
      );
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
          <Mail className="w-5 h-5 mr-2 text-blue-600" />
          Newsletter Subscribers
        </h2>
        
        <div className="flex space-x-2">
          <GlossyButton
            onClick={() => handleExportSubscribers('csv')}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <DownloadCloud className="w-4 h-4" />
            )}
            <span>Export CSV</span>
          </GlossyButton>
          <GlossyButton
            onClick={() => handleExportSubscribers('json')}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export JSON</span>
          </GlossyButton>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subscribers..."
            className="pl-10 w-full px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="unsubscribed">Unsubscribed Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
          <div className="flex items-center text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading subscribers...</span>
        </div>
      ) : filteredSubscribers.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Subscribers Found
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {searchQuery || filterStatus !== 'all' 
              ? 'No subscribers match your current filters.' 
              : 'There are no newsletter subscribers in the system yet.'}
          </p>
        </GlassCard>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subscribed At</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSubscribers.map((subscriber) => (
                <motion.tr 
                  key={subscriber.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {subscriber.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      !subscriber.unsubscribed_at
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {!subscriber.unsubscribed_at
                        ? <CheckCircle className="w-3 h-3 mr-1" /> 
                        : <XCircle className="w-3 h-3 mr-1" />}
                      {!subscriber.unsubscribed_at ? 'Active' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(subscriber.subscribed_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {subscriber.source || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(subscriber.last_modified_at).toLocaleDateString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};