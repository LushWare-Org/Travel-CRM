import mongoose from 'mongoose';

const itinerarySchema = new mongoose.Schema(
  {
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
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
        },
        description: {
          type: String,
          required: true,
        },
        activities: [String],
        accommodation: {
          name: String,
          type: {
            type: String,
            enum: ['hotel', 'resort', 'guesthouse', 'homestay', 'camp', 'other'],
          },
          rating: Number,
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
            name: String,
            description: String,
            duration: String,
          },
        ],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Itinerary', itinerarySchema);
