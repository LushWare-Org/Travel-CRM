import type { FormEvent } from 'react';
import { Star, X } from 'lucide-react';
import { useAssistantPageRegistration } from '../../assistant/capabilities/AssistantCapabilityProvider';
import { assistantFieldState, useAssistantWrittenFields } from '../../assistant/actions/useAssistantFormPrefill';
import { AssistantFilledBadge, assistantMarkedFieldClass } from '../../assistant/components/AssistantFieldMarker';

export interface ReviewFormData {
  name: string;
  email: string;
  rating: number;
  comment: string;
}

interface ReviewModalProps {
  open: boolean;
  reviewData: ReviewFormData;
  isSubmittingReview: boolean;
  setReviewData: (data: ReviewFormData) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export default function ReviewModal({
  open,
  reviewData,
  isSubmittingReview,
  setReviewData,
  onSubmit,
  onClose,
}: ReviewModalProps) {
  const { written, markWritten, clearWritten } = useAssistantWrittenFields();

  // Registered only while the modal is open: a form that is not on screen must
  // not be fillable, and this component stays mounted (rendering null) when it
  // closes.
  useAssistantPageRegistration(
    open
      ? {
          surface: 'review',
          revision: 'review',
          // `step` is a planner idea; a form has exactly one, so it reports 1.
          pageContext: { surface: 'review', revision: 'review', step: 1 },
          actions: ['prefill_form'],
          hostedInDialog: true,
          prefill: {
            form: 'review',
            fields: () => ({
              name: assistantFieldState(reviewData.name, written.has('name')),
              comment: assistantFieldState(reviewData.comment, written.has('comment')),
            }),
            write: (fields) => {
              setReviewData({
                ...reviewData,
                ...(typeof fields.name === 'string' ? { name: fields.name } : {}),
                ...(typeof fields.comment === 'string' ? { comment: fields.comment } : {}),
              });
              markWritten(Object.keys(fields));
            },
          },
        }
      : null,
  );

  return open ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-modal flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full review-modal-mobile p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Write a Review</h3>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Your Name</label>
                <input
                  type="text"
                  required
                  value={reviewData.name}
                  onChange={(e) => {
                    clearWritten('name');
                    setReviewData({ ...reviewData, name: e.target.value });
                  }}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent-500 focus:border-transparent outline-none form-input-mobile ${assistantMarkedFieldClass(
                    written.has('name'),
                  )}`}
                  placeholder="Enter your name"
                />
                {written.has('name') && (
                  <div className="mt-1">
                    <AssistantFilledBadge />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-900">Rating</label>
                  <span className="text-sm text-gray-600">{reviewData.rating} out of 5</span>
                </div>
                <div className="flex gap-2 justify-center sm:justify-start">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className="transition-colors p-1"
                    >
                      <Star
                        className={`w-7 h-7 lg:w-8 lg:h-8 ${
                          star <= reviewData.rating
                            ? 'text-brand-accent-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Your Review</label>
                <textarea
                  required
                  value={reviewData.comment}
                  onChange={(e) => {
                    clearWritten('comment');
                    setReviewData({ ...reviewData, comment: e.target.value });
                  }}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent-500 focus:border-transparent outline-none resize-none form-input-mobile ${assistantMarkedFieldClass(
                    written.has('comment'),
                  )}`}
                  rows={4}
                  placeholder="Share your experience..."
                />
                {written.has('comment') && (
                  <div className="mt-1">
                    <AssistantFilledBadge />
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors button-padding-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed button-padding-sm"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
  ) : null;
}
