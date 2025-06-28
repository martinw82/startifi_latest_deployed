import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Building, 
  Globe, 
  Github, 
  Linkedin,
  FileText,
  CheckCircle,
  AlertCircle,
  Upload
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';

interface SellerFormData {
  // Basic Info
  email: string;
  password: string;
  confirmPassword: string;
  
  // Seller Details
  fullName: string;
  companyName: string;
  website: string;
  githubProfile: string;
  linkedinProfile: string;
  
  // Experience
  yearsExperience: string;
  specializations: string[];
  previousWork: string;
  
  // Portfolio
  portfolioDescription: string;
  sampleProjects: string;
  
  // Legal
  agreeToTerms: boolean;
  agreeToCommission: boolean;
}

const specializationOptions = [
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'Mobile Development',
  'DevOps & Infrastructure',
  'AI & Machine Learning',
  'Blockchain & Web3',
  'E-commerce',
  'SaaS Development',
  'API Development',
  'Database Design',
  'UI/UX Design'
];

export const SellerSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<SellerFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyName: '',
    website: '',
    githubProfile: '',
    linkedinProfile: '',
    yearsExperience: '',
    specializations: [],
    previousWork: '',
    portfolioDescription: '',
    sampleProjects: '',
    agreeToTerms: false,
    agreeToCommission: false,
  });

  const handleInputChange = (field: keyof SellerFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleSpecialization = (spec: string) => {
    const newSpecs = formData.specializations.includes(spec)
      ? formData.specializations.filter(s => s !== spec)
      : [...formData.specializations, spec];
    handleInputChange('specializations', newSpecs);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
      
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
      
      if (!formData.fullName) newErrors.fullName = 'Full name is required';
    }

    if (step === 2) {
      if (!formData.yearsExperience) newErrors.yearsExperience = 'Experience level is required';
      if (formData.specializations.length === 0) newErrors.specializations = 'Select at least one specialization';
      if (!formData.previousWork) newErrors.previousWork = 'Previous work description is required';
    }

    if (step === 3) {
      if (!formData.portfolioDescription) newErrors.portfolioDescription = 'Portfolio description is required';
      if (!formData.sampleProjects) newErrors.sampleProjects = 'Sample projects are required';
    }

    if (step === 4) {
      if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms';
      if (!formData.agreeToCommission) newErrors.agreeToCommission = 'You must agree to the commission structure';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      await signUp(formData.email, formData.password, 'seller');
      
      // In a real app, you'd save the seller application data to the database
      console.log('Seller application submitted:', formData);
      
      // Show success message and redirect
      navigate('/auth', { 
        state: { 
          message: 'Seller application submitted! Please check your email to verify your account. Your application will be reviewed within 2-3 business days.' 
        }
      });
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to submit application' });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Account Setup', icon: User },
    { number: 2, title: 'Experience', icon: Building },
    { number: 3, title: 'Portfolio', icon: FileText },
    { number: 4, title: 'Review', icon: CheckCircle },
  ];

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
            Become a Seller
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Join our community of developers and start monetizing your expertise
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  currentStep >= step.number
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-400'
                }`}>
                  <step.icon className="w-5 h-5" />
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    Step {step.number}
                  </p>
                  <p className={`text-xs ${
                    currentStep >= step.number ? 'text-gray-900 dark:text-white' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 ml-4 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <GlassCard className="p-8">
            {/* Step 1: Account Setup */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Account Setup
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                          errors.fullName ? 'border-red-500' : 'border-white/20'
                        }`}
                        placeholder="John Doe"
                      />
                    </div>
                    {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Name (Optional)
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                        placeholder="Your Company"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                        errors.email ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="john@example.com"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`w-full pl-10 pr-12 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                          errors.password ? 'border-red-500' : 'border-white/20'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 ${
                          errors.confirmPassword ? 'border-red-500' : 'border-white/20'
                        }`}
                        placeholder="••••••••"
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Website (Optional)
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GitHub Profile (Optional)
                    </label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={formData.githubProfile}
                        onChange={(e) => handleInputChange('githubProfile', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                        placeholder="https://github.com/username"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Experience */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Your Experience
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Years of Experience *
                  </label>
                  <select
                    value={formData.yearsExperience}
                    onChange={(e) => handleInputChange('yearsExperience', e.target.value)}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white ${
                      errors.yearsExperience ? 'border-red-500' : 'border-white/20'
                    }`}
                  >
                    <option value="">Select experience level</option>
                    <option value="1-2">1-2 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="6-10">6-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                  {errors.yearsExperience && <p className="text-red-500 text-sm mt-1">{errors.yearsExperience}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Specializations * (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {specializationOptions.map(spec => (
                      <label
                        key={spec}
                        className="flex items-center space-x-2 cursor-pointer p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.specializations.includes(spec)}
                          onChange={() => toggleSpecialization(spec)}
                          className="w-4 h-4 text-blue-600 bg-white/10 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{spec}</span>
                      </label>
                    ))}
                  </div>
                  {errors.specializations && <p className="text-red-500 text-sm mt-1">{errors.specializations}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Previous Work & Experience *
                  </label>
                  <textarea
                    value={formData.previousWork}
                    onChange={(e) => handleInputChange('previousWork', e.target.value)}
                    rows={6}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 resize-none ${
                      errors.previousWork ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="Describe your relevant work experience, notable projects, companies you've worked for, and any achievements that demonstrate your expertise..."
                  />
                  {errors.previousWork && <p className="text-red-500 text-sm mt-1">{errors.previousWork}</p>}
                </div>
              </div>
            )}

            {/* Step 3: Portfolio */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Portfolio & Projects
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Portfolio Description *
                  </label>
                  <textarea
                    value={formData.portfolioDescription}
                    onChange={(e) => handleInputChange('portfolioDescription', e.target.value)}
                    rows={4}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 resize-none ${
                      errors.portfolioDescription ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="Describe your development style, approach to building MVPs, and what makes your work unique..."
                  />
                  {errors.portfolioDescription && <p className="text-red-500 text-sm mt-1">{errors.portfolioDescription}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sample Projects *
                  </label>
                  <textarea
                    value={formData.sampleProjects}
                    onChange={(e) => handleInputChange('sampleProjects', e.target.value)}
                    rows={6}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 resize-none ${
                      errors.sampleProjects ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="List 3-5 of your best projects with brief descriptions, technologies used, and links if available. Include any MVPs or starter templates you've built..."
                  />
                  {errors.sampleProjects && <p className="text-red-500 text-sm mt-1">{errors.sampleProjects}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    LinkedIn Profile (Optional)
                  </label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={formData.linkedinProfile}
                      onChange={(e) => handleInputChange('linkedinProfile', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Review & Submit
                </h2>

                {/* Application Summary */}
                <div className="bg-white/5 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Application Summary</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Name:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{formData.fullName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{formData.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Experience:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{formData.yearsExperience} years</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Specializations:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{formData.specializations.length} selected</span>
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Terms & Conditions</h3>
                  
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-white/10 border-gray-300 rounded focus:ring-blue-500 mt-1"
                    />
                    <div className="text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        I agree to the{' '}
                        <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                          Privacy Policy
                        </a>
                      </span>
                    </div>
                  </label>
                  {errors.agreeToTerms && <p className="text-red-500 text-sm">{errors.agreeToTerms}</p>}

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.agreeToCommission}
                      onChange={(e) => handleInputChange('agreeToCommission', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-white/10 border-gray-300 rounded focus:ring-blue-500 mt-1"
                    />
                    <div className="text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        I understand and agree to the commission structure (70% seller, 30% platform fee)
                      </span>
                    </div>
                  </label>
                  {errors.agreeToCommission && <p className="text-red-500 text-sm">{errors.agreeToCommission}</p>}
                </div>

                {/* What happens next */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    What happens next?
                  </h3>
                  <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Your application will be reviewed within 2-3 business days</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>You'll receive an email notification about your approval status</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Once approved, you can start uploading and selling MVPs</span>
                    </li>
                  </ul>
                </div>

                {errors.submit && (
                  <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                    <p className="text-red-700 dark:text-red-300">{errors.submit}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-8 border-t border-white/20">
              <div>
                {currentStep > 1 && (
                  <GlossyButton
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    Back
                  </GlossyButton>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Step {currentStep} of {steps.length}
                </span>
                
                {currentStep < steps.length ? (
                  <GlossyButton
                    type="button"
                    onClick={handleNext}
                    disabled={loading}
                  >
                    Next
                  </GlossyButton>
                ) : (
                  <GlossyButton
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    loading={loading}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Submit Application</span>
                  </GlossyButton>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};