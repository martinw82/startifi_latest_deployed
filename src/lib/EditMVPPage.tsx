import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, File, X, Plus, Minus, Image, Link as LinkIcon, Github,
  AlertCircle, CheckCircle, Loader2
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { MVPUploadService } from '../lib/mvpUpload';
import { APIService } from '../lib/api';
import type { MVP } from '../types';

// Re-use categories and techStackOptions from UploadMVPPage
const categories = [
  'SaaS', 'E-commerce', 'Portfolio', 'Dashboard', 'Landing Page', 'Mobile App',
  'Utility', 'Social Media', 'Education', 'Healthcare', 'Finance', 'Other'
];

const techStackOptions = [
  'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte',
  'Node.js', 'Express', 'FastAPI', 'Django', 'Flask',
  'TypeScript', 'JavaScript', 'Python', 'PHP', 'Go',
  'Tailwind CSS', 'Bootstrap', 'Material-UI', 'Chakra UI',
  'Supabase', 'Firebase', 'MongoDB', 'PostgreSQL', 'MySQL',
  'Stripe', 'PayPal', 'Auth0', 'Clerk', 'NextAuth',
  'Vercel', 'Netlify', 'AWS', 'Docker', 'Kubernetes'
];

interface FormData {
  title: string;
  tagline: string;
  description: string;
  category: string;
  features: string[];
  techStack: string[];
  demoUrl: string;
  githubUrl: string;
  stackblitzLink: string; // Added stackblitzLink
  licensingTerms: 'standard_commercial' | 'premium_commercial' | 'personal_use_only';
  versionNumber: string;
  changelog: string;
}

interface UploadedFile {
  file?: File; // Optional, for new uploads
  preview: string; // URL for existing, data URL for new
}

export const EditMVPPage: React.FC = () => {
  const { mvpId } = useParams<{ mvpId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    tagline: '',
    description: '',
    category: '',
    features: [''],
    techStack: [],
    demoUrl: '',
    githubUrl: '',
    stackblitzLink: '', // Initial value for stackblitzLink
    licensingTerms: 'standard_commercial',
    versionNumber: '',
    changelog: ''
  });

  const [mvpFile, setMvpFile] = useState<File | null>(null); // New MVP file
  const [previewImages, setPreviewImages] = useState<UploadedFile[]>([]); // New and existing preview images
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMVP, setLoadingMVP] = useState(true);
  const [mvpLoadError, setMvpLoadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!user.is_seller_approved) {
      navigate('/dashboard');
      return;
    }

    if (!mvpId) {
      setMvpLoadError('MVP ID is missing from URL.');
      setLoadingMVP(false);
      return;
    }

    const fetchMVP = async () => {
      setLoadingMVP(true);
      setMvpLoadError(null);
      try {
        const mvp = await APIService.getMVPById(mvpId);
        if (mvp) {
          // Check if the current user is the seller of this MVP
          if (mvp.seller_id !== user.id && user.role !== 'admin' && user.role !== 'both') {
            setMvpLoadError('You are not authorized to edit this MVP.');
            setLoadingMVP(false);
            return;
          }

          setFormData({
            title: mvp.title,
            tagline: mvp.tagline,
            description: mvp.description,
            category: mvp.category,
            features: mvp.features.length > 0 ? mvp.features : [''],
            techStack: mvp.tech_stack,
            demoUrl: mvp.demo_url || '',
            githubUrl: mvp.github_url || '',
            stackblitzLink: mvp.stackblitz_link || '', // Pre-fill stackblitzLink
            licensingTerms: mvp.licensing_terms,
            versionNumber: mvp.version_number,
            changelog: mvp.changelog || ''
          });
          // Populate previewImages with existing URLs
          setPreviewImages(mvp.preview_images.map(url => ({ preview: url })));
        } else {
          setMvpLoadError('MVP not found.');
        }
      } catch (error: any) {
        console.error('Error fetching MVP:', error);
        setMvpLoadError(error.message || 'Failed to load MVP data.');
      } finally {
        setLoadingMVP(false);
      }
    };

    fetchMVP();
  }, [mvpId, user, navigate]);

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const addFeature = () => {
    setFormData(prev => ({ ...prev, features: [...prev.features, ''] }));
  };

  const removeFeature = (index: number) => {
    if (formData.features.length > 1) {
      const newFeatures = formData.features.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, features: newFeatures }));
    }
  };

  const toggleTechStack = (tech: string) => {
    const newTechStack = formData.techStack.includes(tech)
      ? formData.techStack.filter(t => t !== tech)
      : [...formData.techStack, tech];
    setFormData(prev => ({ ...prev, techStack: newTechStack }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['.zip', '.tar.gz', '.rar'];
      const fileExtension = file.name.toLowerCase();
      const isValidType = allowedTypes.some(type => fileExtension.endsWith(type));

      if (!isValidType) {
        setErrors(prev => ({ ...prev, file: 'Please upload a valid ZIP, TAR.GZ, or RAR file.' }));
        return;
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        setErrors(prev => ({ ...prev, file: 'File size must be less than 100MB.' }));
        return;
      }
      if (file.size < 1024) { // 1KB minimum
        setErrors(prev => ({ ...prev, file: 'File is too small. Minimum file size is 1KB.' }));
        return;
      }

      setMvpFile(file);
      setErrors(prev => ({ ...prev, file: '' }));
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newImages: UploadedFile[] = [];

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, images: 'Only image files are allowed for preview images.' }));
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB max per image
        setErrors(prev => ({ ...prev, images: 'Each image must be less than 10MB.' }));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        newImages.push({ file, preview: e.target?.result as string });
        // Only update state once all files are processed
        if (newImages.length === files.length) {
          setPreviewImages(prev => [...prev, ...newImages]);
          setErrors(prev => ({ ...prev, images: '' }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.tagline.trim()) newErrors.tagline = 'Tagline is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.features.filter(f => f.trim()).length === 0) {
      newErrors.features = 'At least one feature is required';
    }
    if (formData.techStack.length === 0) newErrors.techStack = 'At least one technology is required';
    if (previewImages.length === 0) newErrors.images = 'At least one preview image is required';
    if (!formData.versionNumber.trim()) newErrors.versionNumber = 'Version number is required';

    // URL validation
    if (formData.demoUrl && !isValidUrl(formData.demoUrl)) {
      newErrors.demoUrl = 'Please enter a valid URL';
    }
    if (formData.githubUrl && !isValidUrl(formData.githubUrl)) {
      newErrors.githubUrl = 'Please enter a valid URL';
    }
    if (formData.stackblitzLink && !isValidUrl(formData.stackblitzLink)) {
      newErrors.stackblitzLink = 'Please enter a valid StackBlitz URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;
    if (!mvpId) {
      setErrors(prev => ({ ...prev, submit: 'MVP ID is missing.' }));
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const newPreviewFiles = previewImages.filter(img => img.file).map(img => img.file!);

      const updates: Partial<MVP> = {
        title: formData.title,
        tagline: formData.tagline,
        description: formData.description,
        category: formData.category,
        features: formData.features.filter(f => f.trim()),
        tech_stack: formData.techStack,
        demo_url: formData.demoUrl || null,
        github_url: formData.githubUrl || null,
        stackblitz_link: formData.stackblitzLink || null, // Add stackblitz_link to updates
        licensing_terms: formData.licensingTerms,
        version_number: formData.versionNumber,
        changelog: formData.changelog || null,
      };

      const result = await MVPUploadService.updateMVP(
        mvpId,
        updates,
        mvpFile || undefined, // Pass new MVP file if exists
        newPreviewFiles.length > 0 ? newPreviewFiles : undefined // Pass new preview images if exist
      );

      setUploadProgress(100);
      clearInterval(progressInterval);

      if (result.success) {
        setTimeout(() => {
          navigate('/my-mvps', { state: { message: result.message } });
        }, 1000);
      } else {
        setErrors(prev => ({ ...prev, submit: result.message }));
      }

    } catch (error: any) {
      console.error('Update error:', error);
      setErrors(prev => ({ ...prev, submit: error.message || 'Failed to update MVP. Please try again.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingMVP) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Loading MVP Data
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Please wait while we load the MVP information...
          </p>
        </GlassCard>
      </div>
    );
  }

  if (mvpLoadError) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Error Loading MVP
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {mvpLoadError}
          </p>
          <GlossyButton onClick={() => navigate('/my-mvps')}>
            Back to My MVPs
          </GlossyButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Edit MVP
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Update the details of your MVP
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <GlassCard className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                        errors.title ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="e.g., SaaS Starter Kit"
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white ${
                        errors.category ? 'border-red-500' : 'border-white/20'
                      }`}
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tagline *
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                      errors.tagline ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="A brief, compelling description of your MVP"
                  />
                  {errors.tagline && <p className="text-red-500 text-sm mt-1">{errors.tagline}</p>}
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={6}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 resize-none ${
                      errors.description ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="Provide a detailed description of your MVP, its purpose, and what makes it special..."
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>
              </div>

              {/* Features */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Features *
                </h2>
                <div className="space-y-3">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                        placeholder="e.g., User Authentication"
                      />
                      {formData.features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFeature}
                    className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Feature</span>
                  </button>
                </div>
                {errors.features && <p className="text-red-500 text-sm mt-1">{errors.features}</p>}
              </div>

              {/* Tech Stack */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Tech Stack *
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {techStackOptions.map(tech => (
                    <label
                      key={tech}
                      className="flex items-center space-x-2 cursor-pointer p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.techStack.includes(tech)}
                        onChange={() => toggleTechStack(tech)}
                        className="w-4 h-4 text-blue-600 bg-white/10 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{tech}</span>
                    </label>
                  ))}
                </div>
                {errors.techStack && <p className="text-red-500 text-sm mt-1">{errors.techStack}</p>}
              </div>

              {/* Links */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Links (Optional)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <LinkIcon className="w-4 h-4 inline mr-2" />
                      Demo URL
                    </label>
                    <input
                      type="url"
                      value={formData.demoUrl}
                      onChange={(e) => handleInputChange('demoUrl', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                        errors.demoUrl ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="https://your-demo.com"
                    />
                    {errors.demoUrl && <p className="text-red-500 text-sm mt-1">{errors.demoUrl}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Github className="w-4 h-4 inline mr-2" />
                      GitHub URL
                    </label>
                    <input
                      type="url"
                      value={formData.githubUrl}
                      onChange={(e) => handleInputChange('githubUrl', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                        errors.githubUrl ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="https://github.com/username/repo"
                    />
                    {errors.githubUrl && <p className="text-red-500 text-sm mt-1">{errors.githubUrl}</p>}
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-lightning-charge-fill inline mr-2" viewBox="0 0 16 16">
                      <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>
                    </svg>
                    StackBlitz Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.stackblitzLink}
                    onChange={(e) => handleInputChange('stackblitzLink', e.target.value)}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                      errors.stackblitzLink ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="https://stackblitz.com/edit/your-project?embed=1..."
                  />
                  {errors.stackblitzLink && <p className="text-red-500 text-sm mt-1">{errors.stackblitzLink}</p>}
                </div>
              </div>

              {/* File Uploads */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Files
                </h2>

                {/* MVP File Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    MVP File (Optional - Upload to replace existing)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      mvpFile
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : errors.file
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,.tar.gz,.rar,.tgz"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {mvpFile ? (
                      <div className="flex items-center justify-center space-x-3">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <div>
                          <p className="text-green-700 dark:text-green-300 font-medium">
                            {mvpFile.name}
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            {(mvpFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300">
                          Click to upload a new MVP file (ZIP, TAR.GZ, or RAR)
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Leave blank to keep existing file.
                        </p>
                      </div>
                    )}
                  </div>
                  {errors.file && <p className="text-red-500 text-sm mt-1">{errors.file}</p>}
                </div>

                {/* Preview Images Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preview Images * (Upload to replace existing, at least 1 required)
                  </label>
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      errors.images ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
                    }`}
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-300">
                      Click to upload new preview images (JPG, PNG, WebP, GIF)
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Existing images will be replaced. At least 1 image required.
                    </p>
                  </div>
                  {errors.images && <p className="text-red-500 text-sm mt-1">{errors.images}</p>}

                  {/* Preview Images Grid */}
                  {previewImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                      {previewImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Licensing and Version */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Licensing & Version
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Licensing Terms
                    </label>
                    <select
                      value={formData.licensingTerms}
                      onChange={(e) => handleInputChange('licensingTerms', e.target.value as any)}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    >
                      <option value="standard_commercial">Standard Commercial</option>
                      <option value="premium_commercial">Premium Commercial</option>
                      <option value="personal_use_only">Personal Use Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Version Number *
                    </label>
                    <input
                      type="text"
                      value={formData.versionNumber}
                      onChange={(e) => handleInputChange('versionNumber', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                        errors.versionNumber ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="1.0.0"
                    />
                    {errors.versionNumber && <p className="text-red-500 text-sm mt-1">{errors.versionNumber}</p>}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Changelog (Optional)
                  </label>
                  <textarea
                    value={formData.changelog}
                    onChange={(e) => handleInputChange('changelog', e.target.value)}
                    rows={4}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 resize-none ${
                      errors.changelog ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="Describe any changes or updates in this version..."
                  />
                  {errors.changelog && <p className="text-red-500 text-sm mt-1">{errors.changelog}</p>}
                </div>
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                  <p className="text-red-700 dark:text-red-300">{errors.submit}</p>
                </div>
              )}

              {/* Upload Progress */}
              {isSubmitting && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Updating MVP...
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-6 border-t border-white/20">
                <GlossyButton
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/my-mvps')}
                  disabled={isSubmitting}
                >
                  Cancel
                </GlossyButton>

                <GlossyButton
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Update MVP</span>
                    </>
                  )}
                </GlossyButton>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

