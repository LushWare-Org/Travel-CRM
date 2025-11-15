import mongoose from 'mongoose';

/**
 * CustomizedPackage Model
 * Stores customized packages that are created from original packages
 * Separate collection from regular packages
 */
const customizedPackageSchema = new mongoose.Schema(
  {
    customizationSequence: {
      type: Number,
      default: 1,
      min: [1, 'Customization sequence must be at least 1'],
    },
    name: {
      type: String,
      required: [true, 'Please provide a package name'],
      trim: true,
      maxlength: [100, 'Package name cannot be more than 100 characters'],
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
    customizedForLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    originalPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    customizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customizationNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Customization notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for better query performance
customizedPackageSchema.index({ customizedForLead: 1 });
customizedPackageSchema.index({ originalPackage: 1 });
customizedPackageSchema.index({ customizedBy: 1 });
customizedPackageSchema.index({ createdAt: -1 });
customizedPackageSchema.index({ isActive: 1 });

export default mongoose.model('CustomizedPackage', customizedPackageSchema);

