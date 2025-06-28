import React from 'react';
import type { Review } from '../../types';
import { Star, UserCircle, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';

interface MVPReviewsProps {
  reviews: Review[];
  isLoading: boolean;
  error: string | null;
}

const StarRating: React.FC<{ rating: number; maxStars?: number }> = ({ rating, maxStars = 5 }) => {
  return (
    <div className="flex items-center">
      {[...Array(maxStars)].map((_, index) => (
        <Star
          key={index}
          className={`w-5 h-5 ${index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </div>
  );
};

const MVPReviews: React.FC<MVPReviewsProps> = ({ reviews, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading reviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
        <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
        <p className="mt-2 text-red-700 dark:text-red-300 text-center">{error}</p>
      </div>
    );
  }

  if (reviews.length === 0 && !isLoading) {
    return (
      <div className="text-center py-10">
        <MessageSquare className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
        <p className="text-gray-600 dark:text-gray-400">No reviews yet for this MVP.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center mb-3">
            <UserCircle className="w-8 h-8 text-gray-500 dark:text-gray-400 mr-3" />
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {review.user?.email || 'Anonymous User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="ml-auto">
              <StarRating rating={review.rating} />
            </div>
          </div>
          {review.review_text && (
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{review.review_text}</p>
          )}
           {review.is_verified_buyer && (
            <p className="mt-2 text-xs font-semibold text-green-600 dark:text-green-400">Verified Buyer</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default MVPReviews;