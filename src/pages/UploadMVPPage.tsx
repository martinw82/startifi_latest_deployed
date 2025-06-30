import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload,
  File,
  X,
  Plus,
  Minus,
  Image,
  Link as LinkIcon,
  Github,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { MVPUploadService } from '../lib/mvpUpload';
import { APIService } from '../lib/api';
import type { MVP } from '../types';

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
  access_tier: 'free' | 'subscription' | 'one_time_sale';
  price?: number; // Added price field
}

interface UploadedFile {
  file: File;
  preview?: string;
}

const categories = [
  'SaaS',
  'E-commerce',
  'Portfolio',
  'Dashboard',
  'Landing Page',
  'Mobile App',
  'Utility',
  'Social Media',
  'Education',
  'Healthcare',
  'Finance',
  'Other'
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

export const UploadMVPPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Check if this is a version upload
  const mvpId = searchParams.get('mvpId');
  const isVersionUpload = Boolean(mvpId);

  const [existingMVP, setExistingMVP] = useState<MVP | null>(null);
  const [loadingExistingMVP, setLoadingExistingMVP] = useState(false);

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
    versionNumber: '1.0.0',
    changelog: '',
    access_tier: 'free', // Default value for access_tier
    price: undefined, // Default price
  });

  const [mvpFile, setMvpFile] = useState<File | null>(null);
  const [previewImages, setPreviewImages] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load existing MVP data for version upload
  React.useEffect(() => {
    if (mvpId && isVersionUpload) {
      setLoadingExistingMVP(true);
      APIService.getMVPById(mvpId)
        .then((mvp) => {
          if (mvp) {
            setExistingMVP(mvp);
            // Pre-fill form with existing MVP data
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
              licensingTerms: mvp.licensing_terms, // Corrected: Use mvp.licensing_terms
              versionNumber: MVPUploadService.incrementVersion(mvp.version_number, 'patch'),
              changelog: '',
              access_tier: mvp.access_tier || 'free', // Set existing access_tier or default
              price: mvp.price || undefined, // Set existing price or undefined
            });
          } else {
            setErrors({ submit: 'MVP not found' });
          }
        })
        .catch((error) => {
          console.error('Error loading MVP:', error);
          setErrors({ submit: 'Failed to load MVP data' });
        })
        .finally(() => {
          setLoadingExistingMVP(false);
        });
    }
  }, [mvpId, isVersionUpload]);

  // Check if user is authenticated and approved seller
  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please sign in to upload MVPs
          </p>
          <GlossyButton onClick={() => navigate('/auth')}>
            Sign In
          </GlossyButton>
        </GlassCard>
      </div>
    );
  }

  if (!user.is_seller_approved) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Seller Approval Required
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your seller application is pending approval. You'll be able to upload MVPs once approved.
          </p>
          <GlossyButton onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </GlossyButton>
        </GlassCard>
      </div>
    );
  }

  // Show loading state while fetching existing MVP data
  if (isVersionUpload && loadingExistingMVP) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Loading MVP Data
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Please wait while we load the existing MVP information...
          </p>
        </GlassCard>
      </div>
    );
  }

  const handleInputChange = (field: keyof FormData, value: string | string[] | number | undefined) => {
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
      // Validate file type and size
      const allowedTypes = ['.zip', '.tar.gz', '.rar'];
      const fileExtension = file.name.toLowerCase();
      const isValidType = allowedTypes.some(type => fileExtension.endsWith(type));

      if (!isValidType) {
        setErrors(prev => ({ ...prev, file: 'Please upload a valid ZIP, TAR.GZ, or RAR file. Other file types are not allowed for security reasons.' }));
        return;
      }

      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        setErrors(prev => ({ ...prev, file: 'File size must be less than 100MB. Please compress your files or remove unnecessary content.' }));
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

    files.forEach(file => {
      // Validate image file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, images: 'Only image files are allowed for preview images.' }));
        return;
      }

      // Validate image file size (10MB max per image)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, images: 'Each image must be less than 10MB.' }));
        return;
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImage: UploadedFile = {
            file,
            preview: e.target?.result as string
          };
          setPreviewImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
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
    if (!mvpFile) newErrors.file = 'MVP file is required';
    if (previewImages.length === 0) newErrors.images = 'At least one preview image is required';
    // For version uploads, preview images are optional (can use existing ones)
    if (!isVersionUpload && previewImages.length === 0) {
      newErrors.images = 'At least one preview image is required';
    }

    // For version uploads, validate version number and changelog
    if (isVersionUpload) {
      if (!formData.versionNumber.trim()) newErrors.versionNumber = 'Version number is required';
      if (!formData.changelog.trim()) newErrors.changelog = 'Changelog is required for new versions';
    } else {
      // For new uploads, images are required
      if (previewImages.length === 0) newErrors.images = 'At least one preview image is required';
    }

    if (!formData.access_tier) newErrors.access_tier = 'Access tier is required'; // Validate access_tier

    // Validate price if access_tier is 'one_time_sale'
    if (formData.access_tier === 'one_time_sale') {
      if (formData.price === undefined || formData.price === null || isNaN(formData.price)) {
        newErrors.price = 'Price is required for one-time sale MVPs';
      } else if (formData.price <= 0) {
        newErrors.price = 'Price must be a positive number';
      }
    }


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

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      let result;

      const commonData = {
        ...formData,
        features: formData.features.filter(f => f.trim()),
        mvpFile,
        previewImages: previewImages.map(img => img.file),
        licensing_terms: formData.licensingTerms, // Corrected: Use licensing_terms
        // Conditionally include price only if access_tier is 'one_time_sale'
        price: formData.access_tier === 'one_time_sale' ? formData.price : undefined,
      };

      if (isVersionUpload && mvpId) {
        // Upload new version
        const versionUploadData = {
          mvpId,
          ...commonData,
        };

        result = await MVPUploadService.uploadNewMVPVersion(versionUploadData);
      } else {
        // Upload new MVP
        const uploadData = {
          ...commonData,
          sellerId: user.id,
        };

        result = await MVPUploadService.uploadMVP(uploadData);
      }

      setUploadProgress(100);
      clearInterval(progressInterval);

      // Show success message and redirect
      setTimeout(() => {
        const message = isVersionUpload
          ? 'New version uploaded successfully! It will be reviewed before publication.'
          : 'MVP uploaded successfully! It will be reviewed before publication.';
        navigate('/dashboard', { state: { message } });
      }, 1000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setErrors({ submit: error.message || 'Failed to upload MVP. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {isVersionUpload ? `Upload New Version for "${existingMVP?.title || 'MVP'}"` : 'Upload Your MVP'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {isVersionUpload
              ? `Current version: ${existingMVP?.version_number || 'Unknown'} • Upload a new version with improvements`
              : 'Share your creation with the developer community'
            }
          </p>
          {isVersionUpload && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📝 You're uploading a new version. All fields are pre-filled with current data.
                Update the information as needed and provide a changelog describing your changes.
              </p>
            </div>
          )}
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
                    MVP File * (ZIP, TAR.GZ, or RAR - Max 100MB)
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
                          Click to upload your MVP file (ZIP, TAR.GZ, or RAR)
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Files will be automatically scanned for security before approval
                        </p>
                      </div>
                    )}
                  </div>
                  {errors.file && <p className="text-red-500 text-sm mt-1">{errors.file}</p>}
                </div>

                {/* Preview Images Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preview Images * (At least 1 required)
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
                      Click to upload preview images (JPG, PNG, WebP, GIF)
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Maximum 10MB per image, at least 1 image required
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
                      Version Number
                      {isVersionUpload && ' *'}
                    </label>
                    <input
                      type="text"
                      value={formData.versionNumber}
                      onChange={(e) => handleInputChange('versionNumber', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                        errors.versionNumber ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="1.0.0"
                      disabled={!isVersionUpload} // Only editable for version uploads
                    />
                    {errors.versionNumber && <p className="text-red-500 text-sm mt-1">{errors.versionNumber}</p>}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Changelog {isVersionUpload && '*'}
                  </label>
                  <textarea
                    value={formData.changelog}
                    onChange={(e) => handleInputChange('changelog', e.target.value)}
                    rows={4}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 resize-none ${
                      errors.changelog ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder={isVersionUpload
                      ? "Describe what's new in this version (required for version updates)..."
                      : "Describe what's new in this version..."
                    }
                  />
                  {errors.changelog && <p className="text-red-500 text-sm mt-1">{errors.changelog}</p>}
                </div>
              </div>

              {/* Pricing & Access */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Pricing & Access
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Access Tier *
                  </label>
                  <select
                    value={formData.access_tier}
                    onChange={(e) => handleInputChange('access_tier', e.target.value as 'free' | 'subscription' | 'one_time_sale')}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white ${
                      errors.access_tier ? 'border-red-500' : 'border-white/20'
                    }`}
                  >
                    <option value="">Select access tier</option>
                    <option value="free">Free</option>
                    <option value="subscription">Subscription</option>
                    <option value="one_time_sale">One-Time Sale</option>
                  </select>
                  {errors.access_tier && <p className="text-red-500 text-sm mt-1">{errors.access_tier}</p>}
                </div>

                {formData.access_tier === 'one_time_sale' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price (£) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price === undefined ? '' : formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                      className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                        errors.price ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="e.g., 29.99"
                    />
                    {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                  </div>
                )}
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
                      Uploading MVP...
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
                  onClick={() => navigate('/dashboard')}
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
                      <span>{isVersionUpload ? 'Uploading New Version...' : 'Uploading...'}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>{isVersionUpload ? 'Upload New Version' : 'Upload MVP'}</span>
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

