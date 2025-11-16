import mongoose from 'mongoose';

const itinerarySchema = new mongoose.Schema(
  {
    package: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'packageModel',
      required: true,
      unique: false, // Changed to false since both Package and CustomizedPackage can have itineraries
      index: true,
    },
    packageModel: {
      type: String,
      required: true,
      enum: ['Package', 'CustomizedPackage'],
      default: 'Package',
    },
    days: [
      {
        dayNumber: {
          type: Number,
          required: true,
        },
        title: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          required: true,
          trim: true,
        },
        locations: [
          {
            type: String,
            trim: true,
          },
        ],
        activities: [
          {
            type: String,
            trim: true,
          },
        ],
        accommodation: {
          name: {
            type: String,
            trim: true,
          },
          type: {
            type: String,
            enum: ['hotel', 'resort', 'guesthouse', 'homestay', 'camp', 'other'],
          },
          rating: {
            type: Number,
            min: 0,
            max: 5,
          },
          address: {
            type: String,
            trim: true,
          },
          contactNumber: {
            type: String,
            trim: true,
          },
        },
        meals: {
          breakfast: {
            type: Boolean,
            default: false,
          },
          lunch: {
            type: Boolean,
            default: false,
          },
          dinner: {
            type: Boolean,
            default: false,
          },
        },
        transport: {
          type: String,
          enum: ['flight', 'train', 'bus', 'car', 'boat', 'walk', 'other'],
        },
        places: [
          {
            name: {
              type: String,
              trim: true,
            },
            description: {
              type: String,
              trim: true,
            },
            duration: {
              type: String,
              trim: true,
            },
            images: [
              {
                public_id: String,
                url: String,
              },
            ],
          },
        ],
        images: [
          {
            public_id: String,
            url: String,
          },
        ],
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    metadata: {
      totalActivities: {
        type: Number,
        default: 0,
      },
      totalLocations: {
        type: Number,
        default: 0,
      },
      totalPlaces: {
        type: Number,
        default: 0,
      },
      mealsIncluded: {
        breakfast: {
          type: Number,
          default: 0,
        },
        lunch: {
          type: Number,
          default: 0,
        },
        dinner: {
          type: Number,
          default: 0,
        },
      },
      lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for better query performance
itinerarySchema.index({ status: 1, createdAt: -1 });
itinerarySchema.index({ createdBy: 1 });

// Pre-save middleware to calculate metadata
itinerarySchema.pre('save', function calculateMetadata(next) {
  if (this.isModified('days')) {
    let totalActivities = 0;
    let totalLocations = 0;
    let totalPlaces = 0;
    let breakfastCount = 0;
    let lunchCount = 0;
    let dinnerCount = 0;

    this.days.forEach((day) => {
      totalActivities += day.activities?.length || 0;
      totalLocations += day.locations?.length || 0;
      totalPlaces += day.places?.length || 0;

      if (day.meals?.breakfast) breakfastCount += 1;
      if (day.meals?.lunch) lunchCount += 1;
      if (day.meals?.dinner) dinnerCount += 1;
    });

    this.metadata = {
      ...this.metadata,
      totalActivities,
      totalLocations,
      totalPlaces,
      mealsIncluded: {
        breakfast: breakfastCount,
        lunch: lunchCount,
        dinner: dinnerCount,
      },
    };

    // Increment version on modification
    this.version += 1;
  }
  next();
});

// Virtual for total days
itinerarySchema.virtual('totalDays').get(function getTotalDays() {
  return this.days.length;
});

// Virtual for completion percentage (based on required fields)
itinerarySchema.virtual('completionPercentage').get(function getCompletionPercentage() {
  if (!this.days || this.days.length === 0) return 0;

  let totalFields = 0;
  let filledFields = 0;

  this.days.forEach((day) => {
    totalFields += 4; // dayNumber, title, description, activities (required/recommended)

    if (day.dayNumber) filledFields += 1;
    if (day.title) filledFields += 1;
    if (day.description) filledFields += 1;
    if (day.activities && day.activities.length > 0) filledFields += 1;
  });

  return Math.round((filledFields / totalFields) * 100);
});

export default mongoose.model('Itinerary', itinerarySchema);
