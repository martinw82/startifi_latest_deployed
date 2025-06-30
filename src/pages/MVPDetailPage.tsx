// src/pages/MVPDetailPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { APIService, DeploymentService, NotificationService } from '../lib/api';
import type { MVP, Review } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Loader2, AlertTriangle, ExternalLink, Github, Download, Globe, Code } from 'lucide-react';
import MVPImageGallery from '../components/mvp/MVPImageGallery';
import MVPReviews from '../components/mvp/MVPReviews';
import SubmitReviewForm from '../components/mvp/SubmitReviewForm';
import { GlossyButton } from '../components/ui/GlossyButton';

export const MVPDetailPage: React.FC = () => {
  const { mvpId } = useParams<{ mvpId: string }>();
  const [mvp, setMvp] = useState<MVP | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Download state
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadMessage, setDownloadMessage] = useState<string | JSX.Element>('');

  // Deployment state
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deploymentMessage, setDeploymentMessage] = useState<string>('');
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);
  const [repoName, setRepoName] = useState<string>('');

  // Review state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState<string>('');

  const fetchMVPReviews = useCallback(async (currentMvpId: string) => {
    console.log('MVPDetailPage: Fetching reviews for MVP ID:', currentMvpId); // Log MVP ID for reviews
    if (!currentMvpId) return;
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const fetchedReviews = await APIService.getMVPReviews(currentMvpId);
      setReviews(fetchedReviews);
    } catch (err: any) {
      console.error("MVPDetailPage: Error fetching reviews:", err); // Log the error
      setReviewsError(err.message || "Failed to load reviews. Please try again later.");
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mvpId) {
      setError('MVP ID is missing from URL.');
      setLoading(false);
      return;
    }

    const fetchMVPDetails = async () => {
      console.log('MVPDetailPage: Fetching details for MVP ID:', mvpId); // Log MVP ID for details
      setLoading(true);
      setError(null);
      try {
        const data = await APIService.getMVPById(mvpId);
        if (data) {
          setMvp(data);
          fetchMVPReviews(data.id);
        } else {
          setError('MVP not found. It might not exist or is pending approval.');
          setReviews([]);
        }
      } catch (err: any) {
        console.error('MVPDetailPage: Error fetching MVP details:', err); // Log the error
        setError(err.message || 'Failed to fetch MVP details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMVPDetails();
  }, [mvpId, fetchMVPReviews]);

  const handleReviewSubmitted = useCallback(async (newReview: Review) => {
    setReviewSubmitMessage("Review submitted successfully! Refreshing reviews...");
    if (mvp) {
      // Notify the seller of the new review
      try {
        await NotificationService.createNotification({
          user_id: mvp.seller_id,
          type: 'new_review',
          message: `Someone left a new ${ratingToText(newReview.rating)} review on your MVP "${mvp.title}"`,
          link: `/mvp/${mvp.id}`
        });
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the action if notification creation fails
      }
      
      fetchMVPReviews(mvp.id);
    }
    setTimeout(() => setReviewSubmitMessage(''), 3000);
  }, [mvp, fetchMVPReviews]);

  // Helper function to convert rating to text description
  const ratingToText = (rating: number): string => {
    if (rating >= 5) return "excellent";
    if (rating >= 4) return "great";
    if (rating >= 3) return "good";
    if (rating >= 2) return "fair";
    return "poor";
  };

  const handleDeployToNetlify = async () => {
    if (!user || !mvp) {
      setDeploymentMessage('Please login to deploy this MVP.');
      return;
    }
    
    setIsDeploying(true);
    setDeploymentMessage('');
    
    try {
      // Initialize repo name from MVP title
      const suggestedRepoName = mvp.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
        
      setRepoName(suggestedRepoName);
      setShowDeployModal(true);
    } catch (error: any) {
      console.error('Error preparing deployment:', error);
      setDeploymentMessage(error.message || 'Failed to prepare deployment');
      setIsDeploying(false);
    }
  };
  
  const startDeployment = async () => {
    if (!user || !mvp || !repoName) {
      setDeploymentMessage('Missing required information for deployment.');
      return;
    }
    
    setIsDeploying(true);
    setShowDeployModal(false);
    setDeploymentMessage('Initializing deployment process...');
    
    try {
      // Step 1: Start the deployment process
      const startResult = await DeploymentService.startDeployment(user.id, mvp.id);
      
      if (!startResult.success) {
        throw new Error(startResult.message);
      }
      
      setDeploymentId(startResult.deployment_id || null);
      
      // If we need GitHub authentication, redirect to GitHub
      if (startResult.github_auth_url) {
        setDeploymentMessage('Redirecting to GitHub for authentication...');
        setTimeout(() => {
          window.location.href = startResult.github_auth_url as string;
        }, 1000);
        return;
      }
      
      // If we already have GitHub authentication, proceed to create repo
      setDeploymentMessage('Creating GitHub repository...');
      const repoResult = await DeploymentService.createRepoAndPushMVP(
        user.id, 
        mvp.id, 
        startResult.deployment_id as string,
        repoName
      );
      
      if (!repoResult.success) {
        throw new Error(repoResult.message);
      }
      
      setDeploymentMessage('GitHub repository created. Initializing Netlify deployment...');
      
      // Step 3: Initiate Netlify authentication
      const netlifyResult = await DeploymentService.initiateNetlifyAuth(
        user.id,
        startResult.deployment_id as string,
        repoResult.github_repo_url as string
      );
      
      if (!netlifyResult.success) {
        throw new Error(netlifyResult.message);
      }
      
      if (netlifyResult.netlify_auth_url) {
        setDeploymentMessage('Redirecting to Netlify for authentication...');
        setTimeout(() => {
          window.location.href = netlifyResult.netlify_auth_url as string;
        }, 1000);
        return;
      }
      
      throw new Error('No Netlify authentication URL provided.');
      
    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeploymentMessage(error.message || 'Failed to deploy MVP');
      setIsDeploying(false);
    }
  };

  // Helper function to sanitize filename
  const sanitizeFilename = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric, non-space, non-hyphen characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with a single hyphen
      .trim(); // Trim leading/trailing hyphens
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 mt-20 flex flex-col items-center justify-center min-h-[calc(100vh-160px)]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Loading MVP details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 mt-20 flex flex-col items-center justify-center min-h-[calc(100vh-160px)]">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="mt-4 text-lg text-red-700 dark:text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (!mvp) {
    return (
      <div className="container mx-auto p-4 mt-20 flex flex-col items-center justify-center min-h-[calc(100vh-160px)]">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">No MVP data found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 mt-28 mb-10">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
        <div className="p-6">
          {/* MVP Image Gallery */}
          {mvp.preview_images && mvp.preview_images.length > 0 ? (
            <div className="mb-6">
              <MVPImageGallery imageUrls={mvp.preview_images} mvpTitle={mvp.title} />
            </div>
          ) : (
            <div className="mb-6 p-4 text-center border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p className="text-gray-500 dark:text-gray-400">No preview images provided for this MVP.</p>
            </div>
          )}

          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{mvp.title}</h1>
          <p className="text-md text-gray-600 dark:text-gray-400 mb-4">{mvp.tagline}</p>

          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Description:</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{mvp.description}</p>
          </div>

          {mvp.features && mvp.features.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Features:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                {mvp.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {mvp.tech_stack && mvp.tech_stack.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Tech Stack:</h3>
              <div className="flex flex-wrap gap-2">
                {mvp.tech_stack.map((tech, index) => (
                  <span key={index} className="bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-indigo-100 px-3 py-1 rounded-full text-sm">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Category:</h3>
              <p className="text-gray-700 dark:text-gray-300">{mvp.category}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Version:</h3>
              <p className="text-gray-700 dark:text-gray-300">{mvp.version_number}</p>
            </div>
          </div>

          {mvp.seller && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Seller:</h3>
              <p className="text-gray-700 dark:text-gray-300">{mvp.seller.email || 'N/A'}</p>
            </div>
          )}

          {(mvp.demo_url || mvp.github_url) && (
            <div className="my-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Project Links</h3>
              <div className="flex flex-wrap gap-4">
                {mvp.demo_url && (
                  <a
                    href={mvp.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 transition-colors duration-150"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    View Live Demo
                  </a>
                )}
                {mvp.github_url && (
                  <a
                    href={mvp.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600 dark:focus:ring-offset-gray-800 transition-colors duration-150"
                  >
                    <Github className="w-5 h-5 mr-2" />
                    View GitHub Repository
                  </a>
                )}
              </div>
            </div>
          )}
          
          {/* Deployment Options Section */}
          {mvp.github_url && (
            <div className="my-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Deployment Options</h3>
              <div className="flex flex-wrap gap-4">
                <GlossyButton
                  onClick={handleDeployToNetlify}
                  disabled={isDeploying || !user}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeploying ? (
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  ) : (
                    <Globe className="w-5 h-5 mr-3" />
                  )}
                  {isDeploying ? 'Deploying...' : 'Deploy to Netlify'}
                </GlossyButton>
              </div>
            </div>
          )}

          {/* Deployment Status Message */}
          {deploymentMessage && (
            <div className="my-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">{deploymentMessage}</p>
            </div>
          )}

          {/* Download Button Section */}
          <div className="my-8 text-center">
            <button
              onClick={async () => {
                if (!mvpId || !mvp || !user) {
                  setDownloadMessage(user ? "MVP details not loaded." : "Please log in to download.");
                  return;
                }
                setIsDownloading(true);
                setDownloadMessage('');
                try {
                  const response = await APIService.downloadMVP(mvp.id, user.id);
                  if (response.success && response.filePath) {
                    // Programmatically trigger download
                    const link = document.createElement('a');
                    link.href = response.filePath;
                    link.setAttribute('download', `${sanitizeFilename(mvp.title)}.zip`); // Suggest filename
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Create notification about the download
                    try {
                      await NotificationService.createNotification({
                        user_id: mvp.seller_id,
                        type: 'new_download',
                        message: `Someone downloaded your MVP "${mvp.title}"`,
                        link: `/mvp/${mvp.id}`
                      });
                    } catch (notificationError) {
                      console.error('Error creating notification:', notificationError);
                      // Don't fail the download if notification creation fails
                    }
                    
                    setDownloadMessage(
                      <span className="text-green-600 dark:text-green-400">
                        Your download will begin shortly. If it does not, please{' '}
                        <a href={response.filePath} target="_blank" rel="noopener noreferrer" className="underline">
                          click here to download
                        </a>
                        .
                      </span>
                    );
                  } else {
                    setDownloadMessage(response.message || "Download failed. Please try again.");
                  }
                } catch (apiError: any) {
                  console.error('Download API call failed:', apiError);
                  setDownloadMessage(apiError.message || 'An unexpected error occurred during download.');
                } finally {
                  setIsDownloading(false);
                }
              }}
              className="inline-flex items-center justify-center px-10 py-4 border border-transparent text-lg font-semibold rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isDownloading || !user || !mvp}
            >
              {isDownloading ? (
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
              ) : (
                <Download className="w-6 h-6 mr-3" />
              )}
              {isDownloading ? 'Processing...' : (user ? 'Download MVP' : 'Login to Download')}
            </button>
            <>
              {downloadMessage && (
                <p className={`mt-3 text-sm ${typeof downloadMessage === 'string' && downloadMessage.startsWith('Your download will begin shortly') ? '' : 'text-red-600 dark:text-red-400'}`}>
                  {downloadMessage}
                </p>
              )}
              {user && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Having issues with this MVP? 
                  <Link to={`/dispute/${mvp.id}`} className="ml-1 text-neon-green hover:underline">
                    Report a problem
                  </Link>
                </p>
              )}
            </>
            {!user && !isDownloading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                You need to be logged in to download MVPs.
              </p>
            )}
          </div>

          {/* Repository Name Modal */}
          {showDeployModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Deploy to Netlify
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  We'll create a private GitHub repository and deploy it to Netlify. Please enter a name for your repository.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    GitHub Repository Name
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase())}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="my-awesome-project"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Only lowercase letters, numbers, hyphens, and underscores. No spaces.
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeployModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startDeployment}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Start Deployment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MVP Reviews Section */}
          <div className="my-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">User Reviews</h2>
            {reviewSubmitMessage && <p className="mb-4 text-green-600 dark:text-green-400">{reviewSubmitMessage}</p>}

            {user && mvp && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Submit Your Review</h3>
                <SubmitReviewForm
                  mvpId={mvp.id}
                  userId={user.id}
                  onReviewSubmitted={handleReviewSubmitted}
                />
              </div>
            )}
            {!user && mvp && (
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                Please <Link to="/auth" className="text-blue-600 hover:underline">log in</Link> to submit a review.
              </p>
            )}

            <MVPReviews reviews={reviews} isLoading={reviewsLoading} error={reviewsError} />
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Published on: {new Date(mvp.published_at || mvp.created_at).toLocaleDateString()}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Downloads: {mvp.download_count}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Average Rating: {mvp.average_rating ? `${mvp.average_rating.toFixed(1)}/5` : 'Not rated'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
