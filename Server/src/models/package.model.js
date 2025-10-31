import mongoose from 'mongoose';
import slugify from 'slugify';

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a package name'],
      trim: true,
      maxlength: [100, 'Package name cannot be more than 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      maxlength: [2000, 'Description cannot be more than 2000 characters'],
    },
    destination: {
      type: String,
      required: [true, 'Please provide a destination'],
    },
    duration: {
      type: Number,
      required: [true, 'Please provide duration in days'],
      min: [1, 'Duration must be at least 1 day'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: [0, 'Price cannot be negative'],
    },
    maxGroupSize: {
      type: Number,
      default: 10,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'difficult'],
      default: 'moderate',
    },
    category: {
      type: String,
      enum: [
        'honeymoon',
        'family',
        'adventure',
        'budget',
        'luxury',
        'religious',
        'wildlife',
        'beach',
        'heritage',
        'other',
      ],
      default: 'other',
    },
    images: [
      {
        public_id: String,
        url: String,
      },
    ],
    coverImage: {
      public_id: String,
      url: String,
    },
    inclusions: [String],
    exclusions: [String],
    itinerary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Itinerary',
    },
    highlights: [String],
    terms: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    availableFrom: {
      type: Date,
      default: Date.now,
    },
    availableTo: {
      type: Date,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating cannot be more than 5'],
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    bookings: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Create slug from name with uniqueness handling
packageSchema.pre('save', async function createSlug(next) {
  if (this.isModified('name')) {
    let slug = slugify(this.name, { lower: true });
    
    // For new documents, check for slug conflicts
    if (this.isNew) {
      let existingCount = await this.constructor.countDocuments({ slug });
      if (existingCount > 0) {
        // Append timestamp to make slug unique
        slug = `${slug}-${Date.now()}`;
      }
    }
    
    this.slug = slug;
  }
  next();
});

// Virtual for reviews
packageSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'package',
  localField: '_id',
});

// Indexes for better query performance
packageSchema.index({ slug: 1 }, { unique: true });
packageSchema.index({ category: 1 });
packageSchema.index({ destination: 1 });
packageSchema.index({ isActive: 1 });
packageSchema.index({ isFeatured: 1 });
packageSchema.index({ createdBy: 1 });
packageSchema.index({ price: 1 });
packageSchema.index({ duration: 1 });
packageSchema.index({ rating: -1 });
packageSchema.index({ bookings: -1 });
packageSchema.index({ createdAt: -1 });

// Text index for full-text search
packageSchema.index({
  name: 'text',
  description: 'text',
  destination: 'text',
  highlights: 'text',
});

// Compound indexes for common queries
packageSchema.index({ isActive: 1, category: 1 });
packageSchema.index({ isActive: 1, isFeatured: 1 });
packageSchema.index({ isActive: 1, price: 1 });

export default mongoose.model('Package', packageSchema);
