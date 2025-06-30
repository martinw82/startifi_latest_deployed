import React, { useState } from 'react';
import { APIService } from '../../lib/api';
import { Loader2, Star } from 'lucide-react';

interface SubmitReviewFormProps {
  mvpId: string;
  userId: string;
  onReviewSubmitted: () => void;
}

const SubmitReviewForm: React.FC<SubmitReviewFormProps> = ({ mvpId, userId, onReviewSubmitted }) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionMessage, setSubmissionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (rating === 0) {
      setSubmissionMessage({ type: 'error', text: 'Please select a rating.' });
      return;
    }

    setIsSubmitting(true);
    setSubmissionMessage(null);

    try {
      const response = await APIService.submitReview({
        mvpId,
        userId,
        rating,
        comment,
      });

      if (response.success) {
        setSubmissionMessage({ type: 'success', text: response.message });
        setRating(0);
        setComment('');
       onReviewSubmitted(response.review);
      } else {
        setSubmissionMessage({ type: 'error', text: response.message || 'Failed to submit review.' });
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      setSubmissionMessage({ type: 'error', text: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow">
      <div>
        <label htmlFor="rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Your Rating:
        </label>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-6 w-6 cursor-pointer ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'}`}
              onClick={() => handleRatingChange(star)}
            />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Your Review:
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200"
          placeholder="Share your thoughts about this MVP..."
        />
      </div>

      {submissionMessage && (
        <p className={`text-sm ${submissionMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {submissionMessage.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Review'
        )}
      </button>
    </form>
  );
};

export default SubmitReviewForm;