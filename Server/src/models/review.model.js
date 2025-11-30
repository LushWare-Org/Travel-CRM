import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: [true, 'Review must belong to a package'],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    name: {
      type: String,
      required: [true, 'Reviewer name is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    helpful: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);
reviewSchema.index({ package: 1, createdAt: -1 });
reviewSchema.virtual('formattedDate').get(function () {
  return this.createdAt?.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

reviewSchema.set('toJSON', { virtuals: true });
const Review = mongoose.model('Review', reviewSchema);
export default Review;
