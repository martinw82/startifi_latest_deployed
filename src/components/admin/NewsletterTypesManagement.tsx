import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Info,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlossyButton } from '../ui/GlossyButton';
import { NewsletterService } from '../../lib/newsletterService';
import type { NewsletterType } from '../../types';

export const NewsletterTypesManagement: React.FC = () => {
  const [newsletterTypes, setNewsletterTypes] = useState<NewsletterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentType, setCurrentType] = useState<NewsletterType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadNewsletterTypes();
  }, []);

  const loadNewsletterTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const types = await NewsletterService.getAllNewsletterTypes();
      setNewsletterTypes(types);
    } catch (err: any) {
      setError(err.message || 'Failed to load newsletter types');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (type: NewsletterType) => {
    setFormData({
      name: type.name,
      description: type.description || '',
      is_active: type.is_active,
    });
    setCurrentType(type);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && currentType) {
        // Update existing newsletter type
        const result = await NewsletterService.updateNewsletterType(
          currentType.id,
          formData
        );
        
        if (result.success) {
          loadNewsletterTypes();
          setIsModalOpen(false);
        } else {
          setError(result.message);
        }
      } else {
        // Create new newsletter type
        const result = await NewsletterService.createNewsletterType(formData);
        
        if (result.success) {
          loadNewsletterTypes();
          setIsModalOpen(false);
        } else {
          setError(result.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this newsletter type?')) {
      try {
        const result = await NewsletterService.deleteNewsletterType(id);
        
        if (result.success) {
          loadNewsletterTypes();
        } else {
          setError(result.message);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to delete newsletter type');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
          <Mail className="w-5 h-5 mr-2 text-blue-600" />
          Newsletter Types
        </h2>
        
        <GlossyButton
          onClick={openCreateModal}
          className="flex items-center space-x-2"
          size="sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Newsletter Type</span>
        </GlossyButton>
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
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading newsletter types...</span>
        </div>
      ) : newsletterTypes.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Newsletter Types
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You haven't created any newsletter types yet. Newsletter types help organize different kinds of email communications.
          </p>
          <GlossyButton onClick={openCreateModal}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Create First Newsletter Type
          </GlossyButton>
        </GlassCard>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {newsletterTypes.map((type) => (
                <motion.tr 
                  key={type.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                    {type.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {type.description || <em className="text-gray-400 dark:text-gray-500">No description</em>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      type.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {type.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(type.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(type)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for creating/editing newsletter types */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg"
          >
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                {isEditing ? 'Edit Newsletter Type' : 'Create Newsletter Type'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
                    Active
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                  <GlossyButton
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </GlossyButton>
                  <GlossyButton type="submit">
                    {isEditing ? 'Save Changes' : 'Create'}
                  </GlossyButton>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </div>
  );
};